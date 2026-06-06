#!/usr/bin/env python3
"""
总控驱动程序 — 微信小程序多场景搭建与运营系统
读取任务队列，自动将任务分派给对应 Agent 执行，收集回执并更新状态。

用法:
  python controller-driver.py                    # 查看当前可派发任务
  python controller-driver.py --dispatch          # 派发所有就绪任务
  python controller-driver.py --dispatch TASK-BE-005  # 派发指定任务
  python controller-driver.py --status            # 查看项目状态
  python controller-driver.py --validate          # 验收所有待验收回执
  python controller-driver.py --validate TASK-BE-005  # 验收指定任务回执
"""

import os
import sys
import yaml
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

# ============================================================
# 路径配置
# ============================================================
PROJECT_ROOT = Path(__file__).parent.parent  # D:\项目管理\小程序搭建与管理系统
AGENT_TEAM_DIR = PROJECT_ROOT / "agent-team"
TASK_QUEUE_PATH = AGENT_TEAM_DIR / "tasks" / "task-queue.yaml"
PROJECT_STATUS_PATH = AGENT_TEAM_DIR / "status" / "project-status.yaml"
CONTRACTS_DIR = AGENT_TEAM_DIR / "contracts"
RECEIPTS_DIR = AGENT_TEAM_DIR / "receipts"
AGENTS_DIR = AGENT_TEAM_DIR / "agents"
REPORTS_DIR = AGENT_TEAM_DIR / "reports"
DISPATCH_DIR = AGENT_TEAM_DIR / "tasks"

# Agent 名称映射
AGENT_MAP = {
    "controller-agent": "controller",
    "backend-agent": "backend",
    "admin-agent": "admin",
    "miniapp-agent": "miniapp",
    "ai-agent": "ai",
    "qa-release-agent": "qa",
}

# Agent 对应的代码目录
AGENT_CODE_DIR = {
    "backend-agent": PROJECT_ROOT / "backend",
    "admin-agent": PROJECT_ROOT / "admin",
    "miniapp-agent": PROJECT_ROOT / "miniapp",
    "ai-agent": PROJECT_ROOT / "ai-service",
    "qa-release-agent": PROJECT_ROOT / "qa",
}


# ============================================================
# YAML 加载/保存
# ============================================================
def load_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_yaml(path: Path, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)


# ============================================================
# 任务队列操作
# ============================================================
def load_task_queue() -> dict:
    return load_yaml(TASK_QUEUE_PATH)


def save_task_queue(data: dict):
    save_yaml(TASK_QUEUE_PATH, data)


def get_task_by_id(queue: dict, task_id: str) -> Optional[dict]:
    for task in queue.get("tasks", []):
        if task["id"] == task_id:
            return task
    return None


def get_completed_task_ids(queue: dict) -> set:
    return {t["id"] for t in queue["tasks"] if t.get("status") == "已完成"}


def get_ready_tasks(queue: dict) -> list:
    """获取所有依赖已满足、可派发的待开始任务"""
    completed = get_completed_task_ids(queue)
    # 也把开发中的任务算作"已满足依赖"
    in_progress = {t["id"] for t in queue["tasks"] if t.get("status") == "开发中"}
    satisfied = completed | in_progress

    ready = []
    for task in queue["tasks"]:
        if task.get("status") not in ("待开始",):
            continue
        deps = task.get("dependencies", [])
        if all(d in satisfied for d in deps):
            ready.append(task)
    return ready


def get_in_progress_tasks(queue: dict) -> list:
    return [t for t in queue["tasks"] if t.get("status") == "开发中"]


def get_pending_receipt_tasks(queue: dict) -> list:
    return [t for t in queue["tasks"] if t.get("status") == "已提交回执"]


# ============================================================
# 契约读取
# ============================================================
def read_contract(contract_path: str) -> str:
    """读取契约文件内容，contract_path 相对于项目根目录"""
    full_path = PROJECT_ROOT / contract_path
    if full_path.exists():
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    return f"[契约文件不存在: {contract_path}]"


def read_agent_profile(agent_name: str) -> str:
    """读取 Agent 角色定义"""
    path = AGENTS_DIR / f"{agent_name}.md"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return f"[Agent 配置不存在: {agent_name}]"


# ============================================================
# 派发指令生成
# ============================================================
def build_dispatch_prompt(task: dict) -> str:
    """为任务构建完整的派发 prompt，包含所有上下文"""
    agent_name = task["owner_agent"]
    task_id = task["id"]

    # 读取 Agent 角色定义
    agent_profile = read_agent_profile(agent_name)

    # 读取输入契约
    contracts_content = ""
    for contract_path in task.get("input_contracts", []):
        content = read_contract(contract_path)
        contracts_content += f"\n--- 契约: {contract_path} ---\n{content}\n"

    # 读取派发备注
    dispatch_note = task.get("dispatch_note", "")

    # 构建完整 prompt
    prompt = f"""# 任务派发: {task_id} — {task['title']}

## 你的角色

{agent_profile}

## 任务详情

- **任务编号**: {task_id}
- **任务标题**: {task['title']}
- **所属阶段**: {task.get('phase', 'N/A')}
- **优先级**: {task.get('priority', 'N/A')}
- **依赖任务**: {task.get('dependencies', [])}

## 验收标准

{chr(10).join(f'- {c}' for c in task.get('acceptance_criteria', []))}

## 预期输出

{chr(10).join(f'- {o}' for o in task.get('expected_outputs', []))}

## 输入契约

{contracts_content if contracts_content else '无特定契约输入'}

## 派发备注

{dispatch_note if dispatch_note else '无'}

## 执行要求

1. **严格遵循契约**: 所有接口字段、状态码、数据结构必须与契约一致，不得私自修改已冻结契约。
2. **实际编写代码**: 你必须实际创建项目文件和代码，不能只输出方案文档。这是开发任务，需要产出可运行的代码。
3. **项目目录**: 代码放在项目根目录下的对应子目录中。
4. **自测验证**: 完成后进行基本自测（如项目可启动、接口可访问等）。
5. **提交回执**: 完成后在 `agent-team/receipts/` 下创建回执文件 `receipt-{task_id}.yaml`，格式如下:

```yaml
task_id: {task_id}
agent: {agent_name}
status: 已提交回执
completed_work:
  - 完成的工作项1
  - 完成的工作项2
changed_files:
  - 修改/创建的文件路径
added_apis: []
added_tables: []
dependencies: {task.get('dependencies', [])}
blockers: []
self_test:
  result: 通过
  details: "自测详情"
downstream_suggestions: []
risks: []
next_step: "下一步建议"
notes: ""
```

6. **契约变更请求**: 如发现契约需要调整，在回执的 notes 中标记 `[契约变更请求]`，说明原因和建议修改。

现在开始执行任务。
"""
    return prompt


def save_dispatch_file(task: dict, prompt: str):
    """保存派发指令到文件"""
    task_id = task["id"]
    dispatch_path = DISPATCH_DIR / f"dispatch-{task_id}.md"
    with open(dispatch_path, "w", encoding="utf-8") as f:
        f.write(prompt)
    return dispatch_path


# ============================================================
# 回执验收
# ============================================================
def validate_receipt(task_id: str) -> dict:
    """验收指定任务的回执"""
    receipt_path = RECEIPTS_DIR / f"receipt-{task_id}.yaml"
    if not receipt_path.exists():
        # 尝试其他命名格式
        alt_path = RECEIPTS_DIR / f"TASK-{task_id.replace('TASK-', '')}-receipt.yaml"
        if alt_path.exists():
            receipt_path = alt_path
        else:
            return {"valid": False, "error": f"回执文件不存在: {receipt_path}"}

    receipt = load_yaml(receipt_path)

    # 基础校验
    issues = []

    # 1. 任务编号一致性
    if receipt.get("task_id") != task_id:
        issues.append(f"任务编号不匹配: 回执={receipt.get('task_id')}, 期望={task_id}")

    # 2. 完成工作项不为空
    if not receipt.get("completed_work"):
        issues.append("completed_work 为空")

    # 3. 自测结果
    self_test = receipt.get("self_test", {})
    if self_test.get("result") == "失败":
        issues.append(f"自测失败: {self_test.get('details', '')}")

    # 4. 阻塞项
    if receipt.get("blockers"):
        issues.append(f"存在阻塞项: {receipt['blockers']}")

    # 5. 契约变更请求检查
    contract_change = False
    notes = receipt.get("notes", "")
    if "[契约变更请求]" in str(notes):
        contract_change = True

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "contract_change_requested": contract_change,
        "receipt": receipt,
    }


def mark_task_completed(queue: dict, task_id: str, receipt_path: str):
    """将任务标记为已完成"""
    for task in queue["tasks"]:
        if task["id"] == task_id:
            task["status"] = "已完成"
            task["receipt"] = str(receipt_path)
            break
    save_task_queue(queue)


def update_project_status(queue: dict):
    """根据任务队列更新项目状态"""
    status = load_yaml(PROJECT_STATUS_PATH)

    # 统计各 Agent 任务
    agent_data = {}
    for task in queue["tasks"]:
        agent = task["owner_agent"]
        if agent not in agent_data:
            agent_data[agent] = {"completed": [], "current": [], "pending": []}

        if task["status"] == "已完成":
            agent_data[agent]["completed"].append(task["id"])
        elif task["status"] == "开发中":
            agent_data[agent]["current"].append(task["id"])
        elif task["status"] in ("待开始", "已提交回执", "待总控验收"):
            agent_data[agent]["pending"].append(task["id"])

    # 更新 agent_assignments
    for agent, data in agent_data.items():
        if agent not in status.get("agent_assignments", {}):
            status["agent_assignments"][agent] = {}
        aa = status["agent_assignments"][agent]
        aa["completed_tasks"] = data["completed"]
        aa["current_tasks"] = data["current"]
        if data["pending"]:
            aa["pending_tasks"] = data["pending"]

    # 更新统计
    total = len(queue["tasks"])
    completed = sum(1 for t in queue["tasks"] if t["status"] == "已完成")
    in_progress = sum(1 for t in queue["tasks"] if t["status"] == "开发中")
    pending = sum(1 for t in queue["tasks"] if t["status"] in ("待开始", "已提交回执"))

    status["current_summary"] = f"已完成: {completed}, 开发中: {in_progress}, 待开始: {pending}, 总计: {total}"
    status["last_updated"] = datetime.now().strftime("%Y-%m-%d %H:%M")

    save_yaml(PROJECT_STATUS_PATH, status)


# ============================================================
# CLI 命令
# ============================================================
def cmd_status(args):
    """查看项目状态"""
    queue = load_task_queue()
    status = load_yaml(PROJECT_STATUS_PATH)

    print("=" * 60)
    print("项目状态概览")
    print("=" * 60)
    print(f"项目: {status.get('project', 'N/A')}")
    print(f"更新: {status.get('last_updated', 'N/A')}")
    print(f"概要: {status.get('current_summary', 'N/A')}")
    print()

    # 各阶段状态
    print("--- 阶段状态 ---")
    for phase, state in status.get("phase_status", {}).items():
        print(f"  {phase}: {state}")
    print()

    # 各 Agent 状态
    print("--- Agent 状态 ---")
    for agent, data in status.get("agent_assignments", {}).items():
        current = data.get("current_tasks", [])
        completed = data.get("completed_tasks", [])
        print(f"  {agent}:")
        print(f"    状态: {data.get('status', 'N/A')}")
        print(f"    当前任务: {current if current else '无'}")
        print(f"    已完成: {len(completed)} 个")
    print()

    # 关键路径
    print(f"关键路径: {status.get('critical_path', 'N/A')}")
    print()

    # 可派发任务
    ready = get_ready_tasks(queue)
    if ready:
        print("--- 可派发任务 ---")
        for task in ready:
            print(f"  [{task['id']}] {task['title']} → {task['owner_agent']} (P:{task.get('priority', '?')})")
    else:
        print("当前无可派发的新任务")

    # 开发中任务
    in_progress = get_in_progress_tasks(queue)
    if in_progress:
        print()
        print("--- 开发中任务 ---")
        for task in in_progress:
            print(f"  [{task['id']}] {task['title']} → {task['owner_agent']}")


def cmd_dispatch(args):
    """派发任务"""
    queue = load_task_queue()

    if args.task_id:
        # 派发指定任务
        task = get_task_by_id(queue, args.task_id)
        if not task:
            print(f"错误: 任务 {args.task_id} 不存在")
            return
        tasks_to_dispatch = [task]
    else:
        # 派发所有就绪任务
        tasks_to_dispatch = get_ready_tasks(queue)
        if not tasks_to_dispatch:
            print("当前无可派发的新任务")
            return

    print(f"准备派发 {len(tasks_to_dispatch)} 个任务:")
    for t in tasks_to_dispatch:
        print(f"  [{t['id']}] {t['title']} → {t['owner_agent']}")

    if not args.yes:
        confirm = input("\n确认派发? (y/N): ").strip().lower()
        if confirm != "y":
            print("已取消")
            return

    # 生成派发指令
    dispatch_info = []
    for task in tasks_to_dispatch:
        prompt = build_dispatch_prompt(task)
        dispatch_path = save_dispatch_file(task, prompt)

        # 更新任务状态为开发中
        for t in queue["tasks"]:
            if t["id"] == task["id"]:
                t["status"] = "开发中"
                break

        dispatch_info.append({
            "task_id": task["id"],
            "agent": task["owner_agent"],
            "dispatch_file": str(dispatch_path),
            "prompt_length": len(prompt),
        })

        print(f"  ✓ {task['id']} 派发指令已生成: {dispatch_path}")

    save_task_queue(queue)
    update_project_status(queue)

    # 输出派发摘要（供总控 Agent 读取后执行）
    summary_path = DISPATCH_DIR / "dispatch-summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "dispatched_tasks": dispatch_info,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n派发摘要已保存: {summary_path}")
    print("\n--- 下一步 ---")
    print("总控 Agent 应读取 dispatch-summary.json，然后为每个任务启动子 Agent 执行。")
    print("每个子 Agent 应读取对应的 dispatch-*.md 文件作为 prompt。")


def cmd_validate(args):
    """验收回执"""
    queue = load_task_queue()

    if args.task_id:
        # 验收指定任务
        tasks_to_validate = [get_task_by_id(queue, args.task_id)]
        tasks_to_validate = [t for t in tasks_to_validate if t]
    else:
        # 验收所有已提交回执的任务
        tasks_to_validate = [
            t for t in queue["tasks"]
            if t.get("status") in ("已提交回执", "开发中")
        ]

    if not tasks_to_validate:
        print("当前无待验收的回执")
        return

    print(f"准备验收 {len(tasks_to_validate)} 个任务的回执:\n")

    validated = 0
    failed = 0
    contract_changes = []

    for task in tasks_to_validate:
        task_id = task["id"]
        result = validate_receipt(task_id)

        if result["valid"]:
            print(f"  ✓ {task_id} 验收通过")
            if args.apply:
                # 查找回执路径
                receipt_path = RECEIPTS_DIR / f"receipt-{task_id}.yaml"
                if not receipt_path.exists():
                    receipt_path = RECEIPTS_DIR / f"TASK-{task_id.replace('TASK-', '')}-receipt.yaml"
                mark_task_completed(queue, task_id, str(receipt_path))
            validated += 1
        else:
            print(f"  ✗ {task_id} 验收失败:")
            for issue in result["issues"]:
                print(f"      - {issue}")
            failed += 1

        if result.get("contract_change_requested"):
            contract_changes.append(task_id)
            print(f"    ⚠ {task_id} 包含契约变更请求，需总控审核")

    if args.apply:
        save_task_queue(queue)
        update_project_status(queue)
        print(f"\n已更新任务队列和项目状态")

    print(f"\n验收结果: 通过 {validated}, 失败 {failed}")
    if contract_changes:
        print(f"契约变更请求: {contract_changes}")


def cmd_prompt(args):
    """生成并输出指定任务的派发 prompt（供子 Agent 使用）"""
    queue = load_task_queue()
    task = get_task_by_id(queue, args.task_id)
    if not task:
        print(f"错误: 任务 {args.task_id} 不存在")
        return

    prompt = build_dispatch_prompt(task)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(prompt)
        print(f"Prompt 已保存到: {args.output}")
    else:
        print(prompt)


def cmd_next(args):
    """推荐下一步应该派发的任务"""
    queue = load_task_queue()

    # 获取开发中任务
    in_progress = get_in_progress_tasks(queue)

    # 获取可派发任务
    ready = get_ready_tasks(queue)

    # 按优先级排序
    priority_order = {"P0": 0, "P1": 1, "P2": 2}
    ready.sort(key=lambda t: priority_order.get(t.get("priority", "P2"), 2))

    print("=" * 60)
    print("下一步推荐")
    print("=" * 60)

    if in_progress:
        print("\n--- 当前开发中（等待完成）---")
        for t in in_progress:
            print(f"  [{t['id']}] {t['title']} → {t['owner_agent']}")

    if ready:
        print("\n--- 推荐立即派发 ---")
        for t in ready:
            print(f"  [{t['id']}] {t['title']} → {t['owner_agent']} (P:{t.get('priority', '?')}, Phase:{t.get('phase', '?')})")
            deps = t.get("dependencies", [])
            if deps:
                print(f"    依赖: {deps}")
    else:
        print("\n当前无可派发的新任务，等待开发中任务完成")

    # 解锁预览
    completed = get_completed_task_ids(queue)
    print("\n--- 完成后可解锁 ---")
    for t in queue["tasks"]:
        if t["status"] != "待开始":
            continue
        deps = t.get("dependencies", [])
        # 只差一个依赖就满足的任务
        unsatisfied = [d for d in deps if d not in completed]
        if len(unsatisfied) == 1:
            print(f"  {t['id']} 等待 {unsatisfied[0]} 完成")


# ============================================================
# 主入口
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="总控驱动程序 - 微信小程序多场景搭建与运营系统")
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # status
    subparsers.add_parser("status", help="查看项目状态")

    # dispatch
    dispatch_parser = subparsers.add_parser("dispatch", help="派发任务")
    dispatch_parser.add_argument("task_id", nargs="?", help="指定任务编号（不指定则派发所有就绪任务）")
    dispatch_parser.add_argument("-y", "--yes", action="store_true", help="跳过确认")

    # validate
    validate_parser = subparsers.add_parser("validate", help="验收回执")
    validate_parser.add_argument("task_id", nargs="?", help="指定任务编号")
    validate_parser.add_argument("--apply", action="store_true", help="验收通过后自动更新状态")

    # prompt
    prompt_parser = subparsers.add_parser("prompt", help="生成派发 prompt")
    prompt_parser.add_argument("task_id", help="任务编号")
    prompt_parser.add_argument("-o", "--output", help="输出到文件")

    # next
    subparsers.add_parser("next", help="推荐下一步派发")

    args = parser.parse_args()

    if args.command == "status":
        cmd_status(args)
    elif args.command == "dispatch":
        cmd_dispatch(args)
    elif args.command == "validate":
        cmd_validate(args)
    elif args.command == "prompt":
        cmd_prompt(args)
    elif args.command == "next":
        cmd_next(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
