# 生产服务器加固记录（2026-09-27）

> 触发原因：git 历史中曾明文暴露生产服务器 IP（详见 CHANGELOG 2026-09-27 条目）。
> 本文全程使用 `<SERVER_IP>` 占位，**禁止在此文件写入真实 IP、账号名以外的凭据信息**——远端仓库为公开仓库。

## 一、服务器现状基线

| 项 | 值 |
|---|---|
| 系统 | Ubuntu 22.04.5 LTS（内核 5.15.0-177） |
| 登录账号 | `ubuntu`（uid=1000，属 `sudo` 组，**sudo 免密已验证**） |
| 登录方式 | 公钥 ED25519（本机别名 `zfculture`，见 `~/.ssh/config`） |
| Web | nginx 监听 0.0.0.0:80 / 0.0.0.0:443 |
| 后端 | Java 监听 `*:8080` |
| root 密码状态 | `L`（已锁定） |

结论：登录账号本就是 `ubuntu` 且具备 sudo 免密，**无需新建 opsadmin**。

## 二、加固前发现的风险

| # | 风险 | 实测值 |
|---|---|---|
| 1 | root 可直接登录 | `PermitRootLogin yes` |
| 2 | 密码认证开启 | `PasswordAuthentication yes` |
| 3 | **防火墙完全关闭** | `ufw status: inactive` |
| 4 | 后端端口公网裸奔 | `*:8080` 公网可达 |
| 5 | **正在被实时爆破** | auth.log 累计 2553 次 `Failed password`，最近一次发生在加固前 4 分钟 |

## 三、已执行的加固

### 3.1 SSH

备份 → `/etc/ssh/sshd_config.bak.20260927-1514`，随后就地替换：

```bash
sudo sed -i -E \
  -e "s/^#?[[:space:]]*PermitRootLogin[[:space:]]+.*/PermitRootLogin no/" \
  -e "s/^#?[[:space:]]*PasswordAuthentication[[:space:]]+.*/PasswordAuthentication no/" \
  -e "s/^#?[[:space:]]*PubkeyAuthentication[[:space:]]+.*/PubkeyAuthentication yes/" \
  -e "s/^#?[[:space:]]*PermitEmptyPasswords[[:space:]]+.*/PermitEmptyPasswords no/" \
  -e "s/^#?[[:space:]]*KbdInteractiveAuthentication[[:space:]]+.*/KbdInteractiveAuthentication no/" \
  /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart ssh
```

**注意事项（踩坑）**：本机的 `Include /etc/ssh/sshd_config.d/*.conf` 位于主配置第 12 行，而 `PermitRootLogin` / `PasswordAuthentication` 的默认值在第 33 / 123 行。OpenSSH 采用「先出现者生效」规则，因此**写入 `sshd_config.d/` 的 drop-in 会被主配置后面的行覆盖而失效**，必须就地改主文件。

`sshd -T` 实测生效值：

```
permitrootlogin no
pubkeyauthentication yes
passwordauthentication no
kbdinteractiveauthentication no
permitemptypasswords no
```

### 3.2 防火墙

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable
```

仅放行 22 / 80 / 443；8080 公网入站被默认 deny 拦截。

## 四、加固后验证

| 验证项 | 结果 |
|---|---|
| `ubuntu` 公钥登录 | ✅ 成功 |
| `root` 登录 | ✅ `Permission denied (publickey)` |
| 密码认证方式 | ✅ 服务端不再提供 password 方法 |
| 本地 `127.0.0.1:8080` | ✅ `/actuator/health` → `{"status":"UP"}`（nginx 反代不受影响） |
| 公网 `8080` | ✅ 000（超时，已挡） |
| 公网 443 / 80 | ✅ 200 / 404（nginx 默认站点，正常） |

## 五、回滚方法

```bash
sudo cp -a /etc/ssh/sshd_config.bak.20260927-1514 /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart ssh
sudo ufw disable          # 如需临时放开全部端口
```

## 六、剩余待办

| 优先级 | 事项 | 说明 |
|---|---|---|
| P1 | 云厂商安全组 | ufw 只管主机层，控制台侧安全组需同样只放行 22/80/443，来源 IP 尽量限办公网 |
| P2 | 后端改监听回环 | Spring Boot 设 `server.address=127.0.0.1`，不依赖防火墙兜底 |
| P2 | fail2ban | 密码认证已关闭，爆破已无法成功，仅剩日志噪音，优先级降低 |
| P2 | 定期审计 | `grep "Failed password" /var/log/auth.log`，确认加固后是否归零 |
