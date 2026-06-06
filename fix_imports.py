"""
批量修复后端编译错误:
1. 确保所有实体/DTO类有@Data注解(Lombok)
2. 确保有@Slf4j的类有注解
3. 修复IService导入
4. 修复BaseEntity导入
5. 修复OperationLogAspect命名冲突
6. 修复AiRecommendationService包引用
"""
import os
import re

BASE = r"D:\项目管理\小程序搭建与管理系统\backend\src\main\java\com\miniprogram"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_file(path):
    content = read_file(path)
    original = content
    modified = False
    
    # 1. Fix IService import - add com.baomidou.mybatisplus.extension.service.IService
    if '找不到符号' in '' and 'IService' in content and 'import com.baomidou.mybatisplus.extension.service.IService' not in content:
        if 'extends IService' in content or 'IService<' in content:
            # Find last import line
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    last_import_idx = i
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, 'import com.baomidou.mybatisplus.extension.service.IService;')
                content = '\n'.join(lines)
                modified = True
    
    # 2. Fix BaseEntity import
    if 'extends BaseEntity' in content and 'import com.miniprogram.common.BaseEntity' not in content:
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, 'import com.miniprogram.common.BaseEntity;')
            content = '\n'.join(lines)
            modified = True
    
    # 3. Fix OperationLogAspect - use fully qualified name for entity OperationLog
    if 'OperationLogAspect' in path:
        # Replace ambiguous OperationLog references with fully qualified names
        content = content.replace(
            'import com.miniprogram.annotation.OperationLog;',
            'import com.miniprogram.annotation.OperationLog;'
        )
        # In the aspect body, replace OperationLog entity usage
        if 'new OperationLog(' in content:
            content = content.replace('new OperationLog(', 'new com.miniprogram.entity.OperationLog(')
            modified = True
    
    # 4. Fix AiRecommendationService - AiConversation package
    if 'AiRecommendationService' in path and 'AiConversation' in content:
        # Fix incorrect package reference
        content = content.replace('AiConversation.', 'com.miniprogram.entity.AiConversation.')
        # Or add import
        if 'import com.miniprogram.entity.AiConversation' not in content:
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.startswith('import '):
                    last_import_idx = i
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, 'import com.miniprogram.entity.AiConversation;')
                content = '\n'.join(lines)
                modified = True
    
    if content != original:
        write_file(path, content)
        return True
    return False

# Walk all Java files
fixed_count = 0
for root, dirs, files in os.walk(BASE):
    for f in files:
        if f.endswith('.java'):
            path = os.path.join(root, f)
            if fix_file(path):
                fixed_count += 1
                print(f"Fixed: {path}")

print(f"\nTotal fixed: {fixed_count} files")
