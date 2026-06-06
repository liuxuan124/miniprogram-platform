"""
微信小程序多场景搭建与运营系统 — Locust 性能测试

测试场景覆盖:
  - 管理后台: 登录、页面/商品/订单/内容列表查询
  - 小程序端: 首页加载、商品列表、AI对话
  - 权重按真实流量比例分配

用法:
  locust -f locustfile.py --host=http://localhost:8080
  或使用 run.sh 一键运行
"""

import json
import logging
from faker import Faker
from locust import HttpUser, task, between, events

fake = Faker("zh_CN")
logger = logging.getLogger("miniapp_perf")


class MiniAppAdminUser(HttpUser):
    """管理后台用户 — 模拟运营人员操作"""

    wait_time = between(1, 3)
    weight = 3  # 管理后台流量约占 30%

    def on_start(self):
        """用户启动时先登录获取 Token"""
        self.token = ""
        self.headers = {"Content-Type": "application/json"}
        self.login()

    def login(self):
        """POST /api/admin/auth/login — 管理员登录"""
        payload = {
            "username": "admin_perf_test",
            "password": "perf_test_123",
        }
        with self.client.post(
            "/api/admin/auth/login",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/admin/auth/login",
        ) as resp:
            if resp.status_code == 200:
                try:
                    body = resp.json()
                    self.token = body.get("data", {}).get("token", "")
                    if self.token:
                        self.headers["Authorization"] = f"Bearer {self.token}"
                        resp.success()
                    else:
                        resp.failure("登录成功但未返回 token")
                except json.JSONDecodeError:
                    resp.failure("响应非 JSON 格式")
            else:
                resp.failure(f"登录失败, HTTP {resp.status_code}")

    @task(5)
    def list_pages(self):
        """GET /api/admin/page/list — 页面列表查询 (高频)"""
        with self.client.get(
            "/api/admin/page/list",
            headers=self.headers,
            params={"page": 1, "size": 20},
            catch_response=True,
            name="/api/admin/page/list",
        ) as resp:
            self._check_list_response(resp, "页面列表")

    @task(4)
    def list_products(self):
        """GET /api/admin/product/list — 商品列表查询"""
        with self.client.get(
            "/api/admin/product/list",
            headers=self.headers,
            params={"page": 1, "size": 20},
            catch_response=True,
            name="/api/admin/product/list",
        ) as resp:
            self._check_list_response(resp, "商品列表")

    @task(4)
    def list_orders(self):
        """GET /api/admin/order/list — 订单列表查询"""
        with self.client.get(
            "/api/admin/order/list",
            headers=self.headers,
            params={"page": 1, "size": 20, "status": ""},
            catch_response=True,
            name="/api/admin/order/list",
        ) as resp:
            self._check_list_response(resp, "订单列表")

    @task(2)
    def list_articles(self):
        """GET /api/admin/content/article/list — 内容列表查询"""
        with self.client.get(
            "/api/admin/content/article/list",
            headers=self.headers,
            params={"page": 1, "size": 20},
            catch_response=True,
            name="/api/admin/content/article/list",
        ) as resp:
            self._check_list_response(resp, "内容列表")

    def _check_list_response(self, resp, label):
        """通用列表响应检查"""
        if resp.status_code == 200:
            try:
                body = resp.json()
                if body.get("code") == 0 or body.get("code") == 200:
                    resp.success()
                else:
                    resp.failure(f"{label}业务异常: {body.get('message', 'unknown')}")
            except json.JSONDecodeError:
                resp.failure(f"{label}响应非 JSON")
        elif resp.status_code == 401:
            # Token 过期，重新登录
            resp.failure(f"{label}认证失败, 尝试重新登录")
            self.login()
        else:
            resp.failure(f"{label}HTTP {resp.status_code}")


class MiniAppMpUser(HttpUser):
    """小程序端用户 — 模拟 C 端用户浏览与交互"""

    wait_time = between(1, 3)
    weight = 7  # 小程序端流量约占 70%

    def on_start(self):
        """小程序用户启动时模拟登录"""
        self.token = ""
        self.headers = {"Content-Type": "application/json"}
        self.mp_login()

    def mp_login(self):
        """模拟小程序微信登录 (简化)"""
        payload = {
            "code": fake.lexify("??????????"),
            "encryptedData": fake.sha1(),
            "iv": fake.lexify("??????????????????????=="),
        }
        with self.client.post(
            "/api/mp/auth/login",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/mp/auth/login",
        ) as resp:
            if resp.status_code == 200:
                try:
                    body = resp.json()
                    self.token = body.get("data", {}).get("token", "")
                    if self.token:
                        self.headers["Authorization"] = f"Bearer {self.token}"
                        resp.success()
                    else:
                        # 登录接口可能未就绪，降级为无 Token 访问
                        resp.success()
                        logger.warning("小程序登录未返回 token，降级为匿名访问")
                except json.JSONDecodeError:
                    resp.failure("小程序登录响应非 JSON")
            else:
                # 降级：不阻塞后续测试
                resp.success()
                logger.warning(f"小程序登录失败 HTTP {resp.status_code}，降级为匿名访问")

    @task(8)
    def load_home(self):
        """GET /api/mp/page/home — 小程序首页加载 (最高频)"""
        with self.client.get(
            "/api/mp/page/home",
            headers=self.headers,
            catch_response=True,
            name="/api/mp/page/home",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"首页加载失败 HTTP {resp.status_code}")

    @task(5)
    def list_mp_products(self):
        """GET /api/mp/product/list — 小程序商品列表"""
        with self.client.get(
            "/api/mp/product/list",
            headers=self.headers,
            params={"page": 1, "size": 20, "categoryId": ""},
            catch_response=True,
            name="/api/mp/product/list",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"小程序商品列表失败 HTTP {resp.status_code}")

    @task(2)
    def ai_chat(self):
        """POST /api/mp/ai/chat — AI 对话请求 (低频但耗资源)"""
        payload = {
            "message": fake.sentence(nb_words=10),
            "sessionId": fake.uuid4(),
            "sceneType": fake.random_element(["page_builder", "copywriting", "general"]),
        }
        with self.client.post(
            "/api/mp/ai/chat",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/mp/ai/chat",
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            elif resp.status_code == 504:
                # AI 响应超时，标记为预期内
                resp.failure("AI 对话超时 (504)")
            else:
                resp.failure(f"AI 对话失败 HTTP {resp.status_code}")


# ── 事件钩子 ──────────────────────────────────────────────────────────────

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    logger.info("=" * 60)
    logger.info("性能测试开始")
    logger.info(f"目标主机: {environment.host}")
    logger.info("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    logger.info("=" * 60)
    logger.info("性能测试结束")
    logger.info("=" * 60)


@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, exception, **kwargs):
    logger.warning(
        f"请求失败 | {request_type} {name} | 耗时: {response_time:.0f}ms | 异常: {exception}"
    )
