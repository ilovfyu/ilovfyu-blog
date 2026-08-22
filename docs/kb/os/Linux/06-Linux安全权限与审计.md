---
title: "Linux 安全权限与审计"
permalink: /kb/os/Linux/06-Linux安全权限与审计/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Linux 网络与系统调用实操", link: /kb/os/Linux/05-Linux网络与系统调用实操/ }
next: { text: "Linux 内核架构与启动原理", link: /kb/os/Linux/07-Linux内核架构与启动原理/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
把 Ch16 Protection 与 Ch17 Security 落到 Linux 上：从八进制 `chmod` 与 `umask` 讲清楚权限模型，用 `setuid`/`sticky bit` 实验理解"为什么 passwd 普通用户能改自己密码"，用 ACL 与 capabilities 实现比 root 更细粒度的授权，最后配置 sudoers、SSH 加固、防火墙与 auditd 审计，形成一套可落地的加固清单。概念原理对应 [保护机制](/kb/os/安全/01-保护机制与访问控制/) 与 [安全防御](/kb/os/安全/05-安全防御与审计/)。
:::

教材说"保护 = 主体对客体的一组访问权限"，Linux 的经典实现是 rwx 三元组；但生产环境需要更细：ACL 给指定用户单独授权、capabilities 把 root 拆成单项能力、auditd 记录每一次关键访问。这一篇的目标：**能把权限控制精细到"该给的给、不该给的坚决不给"，并且能审计"谁动过什么"。**

## 1. 文件权限深入

### 1.1 八进制 chmod

```bash
touch secret.txt
ls -l secret.txt          # -rw-r--r--  => 644
chmod 600 secret.txt      # 属主可读写，其他人全无
chmod 754 file.sh         # 7=rwx 5=r-x 4=r--，属主/组/其他
```
| 八进制 | 二进制 | 权限 |
|---|---|---|
| 7 | 111 | rwx |
| 6 | 110 | rw- |
| 5 | 101 | r-x |
| 4 | 100 | r-- |
| 0 | 000 | --- |

**速记**：r=4、w=2、x=1，相加即可。`600` = 属主 4+2=6、组 0、其他 0。

### 1.2 umask：默认权限面具

```bash
umask            # 022
touch newfile && ls -l newfile    # -rw-r--r-- (644)
mkdir newdir  && ls -ld newdir    # drwxr-xr-x (755)
```
预期输出片段：
```
umask 输出：0022
-rw-r--r-- 1 zhang zhang 0 Aug 10 12:40 newfile
```
解读：默认权限 = 666（文件）/ 777（目录） **减去** umask。`022` 意味着新文件不写组和其他位，`077` 则默认完全私有。改法：`umask 077`（当前 shell）或写入 `/etc/profile` / `~/.bashrc` 永久生效。

::: tip 安全习惯
服务器上建议 `umask 027`（组内可读、其他人不可读），数据库密钥、证书目录配 `umask 077`。新文件权限由 umask 决定，比事后 chmod 更省事也更能防漏。
:::

### 1.3 sticky bit：`/tmp` 的保护

```bash
ls -ld /tmp
# drwxrwxrwt  => 末位 t 就是 sticky bit
chmod +t shared_dir        # 或 chmod 1777
```
解读：sticky bit 作用：目录对所有人生成可写，但**只有文件属主（或 root）才能删除/改名自己的文件**。`/tmp`、`/var/tmp` 靠它防止"任何人删任何人的临时文件"。看权限串末尾：`t`（有 x）或 `T`（无 x）。

### 1.4 setuid / setgid 实验

setuid = 程序运行时**临时获得文件属主的身份**。经典例子 `passwd`：

```bash
ls -l /usr/bin/passwd
# -rwsr-xr-x  => 属主权限位 rws，s = setuid
```
解读：`passwd` 属主是 root，普通用户执行它时进程的 effective uid 变成 root——这样才能写 `/etc/shadow`。这就是"普通用户能改自己密码"的机制。这正是教材"保护环/特权"思想在 Linux 的落地。

```bash
# 自己做一个 setuid 实验（虚拟机中，安全练习）
sudo cp /bin/cat /usr/local/bin/mysuid
sudo chmod u+s /usr/local/bin/mysuid
ls -l /usr/local/bin/mysuid    # -rwsr-xr-x
# 用普通用户执行它，它能读 /etc/shadow（对比：原 cat 读不了）
```
设置方式：
- `chmod u+s file` / `chmod 4755 file` → setuid（effective uid = 属主）
- `chmod g+s dir` / `chmod 2775 dir` → setgid（目录里新建文件自动继承目录的组）
- 权限串中对应位显示 `s`（有 x）或 `S`（无 x）。

::: warning setuid 是双刃剑
高权限程序一旦有漏洞，等于给攻击者一个 root 后门。查找系统里所有 setuid 文件并评估：`find / -perm -4000 -type f 2>/dev/null`。尽量"最小化使用"，能用 capabilities（第 3 节）替代就更好。
:::

## 2. ACL：超出 rwx 的细粒度授权

标准权限只有"属主/组/其他"三类，ACL（访问控制列表）可以给任意用户单独授权：

```bash
setfacl -m u:alice:rw   report.txt    # 给 alice 加 rw
getfacl report.txt
```
预期输出片段：
```
# file: report.txt
# owner: zhang
# group: zhang
user::rw-
user:alice:rw-          ← alice 特有
group::r--
mask::rw-                ← mask 限制非属主权限的最大值
other::r--
```
解读：
- `user:alice:rw-` 是命名用户项；`mask` 是"除属主与 other 外所有授权"的上限，`setfacl -m m::r` 可整体收紧。
- 撤销：`setfacl -x u:alice report.txt`；删除全部 ACL：`setfacl -b report.txt`。
- **注意**：设了 ACL 的文件，`ls -l` 权限位会多一个 `+`（`-rw-rw-r--+`）。

```bash
# 给目录加默认 ACL：其下新建文件自动继承
setfacl -m d:u:alice:rwx project/
```

::: important ACL 对应教材的哪种模型？
教材讲访问矩阵可以用 ACL 或 capability 实现。`setfacl` 就是**按客体（文件）挂访问列表**的 ACL 实现；第 3 节的 capabilities 则更接近"把权限发给主体"的能力模型。
:::

## 3. capabilities：把 root 拆成单项能力

传统 setuid 把整个 root 给出去，capabilities 只给"干那件事所需的最小能力"。

```bash
# ping 的例子：只需要 cap_net_raw，用文件能力而不是 setuid root
sudo setcap cap_net_raw+ep /usr/bin/ping
getcap /usr/bin/ping
```
预期输出片段：
```
/usr/bin/ping = cap_net_raw+ep
```
解读：`cap_net_raw` 允许原始套接字（ICMP），`+ep` = effective + permitted。ping 有它就能发包，而无须整个 root。比较：很多发行版 ping 是 `setuid root`（0755 + s），用 setcap 更安全。

```bash
capsh --print      # 查看当前进程的全部能力
getpcaps 1120      # 查看某进程的能力
```
预期输出片段：
```
Current: = cap_chown,cap_dac_override,...,cap_net_raw,...
```
```bash
sudo setcap cap_net_bind_service+ep /usr/local/bin/myservice
# 这样普通用户也能让程序绑定 80 端口（<1024），无需 root 运行整个服务
```
常用能力：
| 能力 | 作用 |
|---|---|
| `cap_net_bind_service` | 绑定 <1024 端口 |
| `cap_net_raw` | 原始/ICMP 套接字（ping、traceroute） |
| `cap_sys_admin` | 挂载、命名空间等大量管理操作（最危险之一） |
| `cap_sys_chroot` | chroot |
| `cap_kill` | 杀任意进程 |
| `cap_dac_override` | 绕过文件读写权限检查 |

::: tip 能力面最小化
容器场景（Docker/K8s）常用 `--cap-drop=ALL --cap-add=cap_net_raw` 之类配置——本质就是"给进程它只需要的几个能力"。面试问"容器为什么比虚拟机安全"，能力的角度可以答：容器进程默认几乎没有任何特权能力。
:::

## 4. sudoers：visudo 配置

```bash
sudo visudo        # 必须用 visudo 编辑，语法错误会阻止保存
```
典型内容：
```
# 用户权限行：user  host=(runas)  commands
zhang   ALL=(ALL:ALL) ALL
devops  ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart nginx
webadmin  ALL=(ALL) /usr/bin/systemctl *, /bin/systemctl restart nginx
```
解读：
- `ALL=(ALL:ALL) ALL` = 所有主机、以任意用户/组、执行任意命令。
- `NOPASSWD:` 免密；限制命令列表 = 只允许某些命令（注意：`systemctl *` 这类通配符仍可能被利用，仅作示意，生产应更严格）。
- 查当前权限：`sudo -l`；切换身份：`sudo -u alice id`。

::: warning 别给 sudo 配得太宽
给开发者"ALL ALL"等于默认 root。最小权限示例：`%ops ALL=(ALL) /usr/bin/systemctl, /usr/sbin/useradd`。定期用 `sudo -l` 审计。
:::

## 5. SSH 安全加固

### 5.1 密钥认证

```bash
ssh-keygen -t ed25519 -C "server-access"    # 生成密钥对
ssh-copy-id user@server                      # 把公钥推送到服务器
ssh user@server                              # 现在可免密登录
```

### 5.2 加固 sshd_config

```bash
sudo vim /etc/ssh/sshd_config
# 关键配置：
#   PermitRootLogin no           禁止 root 密码/登录
#   PasswordAuthentication no    只允许密钥
#   PubkeyAuthentication yes     启用密钥
#   MaxAuthTries 3               限制尝试次数
#   AllowUsers alice bob         白名单
sudo systemctl restart sshd       # 生效前务必另开一个终端保持会话
```
::: warning 锁死自己的安全操作
改 sshd_config 前先 `sudo sshd -t` 做语法检查，改完先开新会话验证能登录，再重启 sshd。在云主机上把密码认证关掉前，**确保密钥已就位**，否则你再也登不进去。
:::

### 5.3 fail2ban：暴力破解防线

```bash
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# jail.local 中设置：
#   [sshd]
#   enabled = true
#   maxretry = 5
#   bantime  = 3600
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd    # 查看被封锁的 IP
```
预期输出片段：
```
Status for the jail: sshd
|- Filter
|  |- Currently failed: 1
|  `- Total failed:     47
`- Actions
   |- Currently banned: 3
   `- Total banned:     12
```
解读：连续失败 N 次后临时封 IP，是暴力破解的标准缓解手段（配合日志 `/var/log/auth.log` 使用）。

## 6. 防火墙：ufw / firewalld

### 6.1 ufw（Debian/Ubuntu 系）

```bash
sudo ufw default deny incoming     # 默认拒绝入站
sudo ufw default allow outgoing    # 默认放行出站
sudo ufw allow 22/tcp
sudo ufw allow 80,443/tcp
sudo ufw enable
sudo ufw status numbered           # 查看规则及编号
sudo ufw delete 3                  # 按编号删除规则
```

### 6.2 firewalld（RHEL/CentOS 系）

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```
解读：ufw/firewalld 都是 iptables/nftables 的前端。**原则：默认拒绝 + 显式放行必要端口**。云主机另需在安全组层面设置同等规则（两层都要检查）。

## 7. auditd：内核级审计

### 7.1 配置规则

```bash
sudo apt install auditd
sudo systemctl enable --now auditd
sudo auditctl -w /etc/passwd -p wa -k passwd_watch   # 监控写入/属性变更
sudo auditctl -w /etc/ssh/sshd_config -p wa -k ssh_conf
sudo auditctl -a always,exit -F arch=b64 -S execve -k exec_events   # 记录所有程序执行
```
解读：`-w` 文件监控、`-p wa` 监听 write/attribute 事件、`-k` 打标签；`-a` 加系统调用规则。规则写 `/etc/audit/rules.d/` 可持久化。

### 7.2 查询审计

```bash
sudo ausearch -k passwd_watch -i    # 按标签查事件
sudo aureport -au                   # 认证失败报告
sudo aureport -a                    # 访问事件汇总
```
预期输出片段：
```
Number of events: 42
number of syscalls: 42
...
              date  time      auid  type     success event
2026-08-10 13:01:02 1000      USER_ACCT   yes    1123
2026-08-10 13:01:02 1000      LOGIN       yes    1124
```
解读：`aureport` 生成汇总报告，`ausearch` 按条件查明细。**谁在什么时间用哪个 uid 改过 `/etc/passwd`，auditd 全部记录在案**——这是教材"审计机制（audit trail）"的生产实现。日志在 `/var/log/audit/audit.log`。

## 8. SELinux / AppArmor：强制访问控制

Linux 默认是 **DAC**（自主访问控制：属主自己决定权限）。SELinux/AppArmor 提供 **MAC**（强制访问控制：系统策略决定，属主无权改变）。

```bash
# SELinux（RHEL/CentOS 系）
getenforce        # Enforcing / Permissive / Disabled
sestatus          # 详细状态
sudo setenforce 0 # 临时切 Permissive（宽松，只记录不阻止）——不要在生产乱切
ausearch -m avc -ts recent   # 查被 SELinux 拒绝的事件
```
```bash
# AppArmor（Ubuntu/Debian 系）
sudo aa-status            # 已加载的 profile 与 enforce 状态
sudo apparmor_status      # 同款，老命令
sudo aa-enforce /etc/apparmor.d/usr.sbin.mysqld
sudo dmesg | grep -i apparmor   # 查看拦截记录
```

| 维度 | SELinux | AppArmor |
|---|---|---|
| 适用发行版 | RHEL/CentOS/Fedora | Ubuntu/Debian/SUSE |
| 控制粒度 | 全局类型强制（TE），所有进程/文件打标签 | 按"进程 profile"限定路径/能力 |
| 上手难度 | 高（策略复杂） | 中 |
| 常见现象 | 服务"无原因"启动失败、日志被拒，多因 SELinux | 应用被限无法读某目录 |

::: tip 实战排查
云主机上 nginx 启动失败但日志正常？先查 MAC：`getenforce`（或 `aa-status`），SELinux 看 `ausearch -m avc`，AppArmor 看 `dmesg | grep apparmor`。确认是 MAC 拦截后，要么补策略，要么（生产中谨慎）调宽松模式，而不是直接禁用。
:::

## 9. 系统加固清单

| 类别 | 动作 | 命令/位置 |
|---|---|---|
| 权限 | 收紧 umask、清理 setuid 文件 | `umask 027`；`find / -perm -4000` |
| 账户 | 禁止 root 远程登录、删除无用账户 | sshd_config、`userdel` |
| SSH | 密钥认证、禁密码、fail2ban | sshd_config、fail2ban |
| 防火墙 | 默认拒绝 + 放行必要端口 | ufw / firewalld |
| 审计 | 监控关键文件与系统调用 | auditd + `auditctl` |
| 更新 | 及时打补丁、升级内核 | `apt upgrade` / `yum update` |
| MAC | 开启并配置 SELinux/AppArmor | `setenforce 1` / `aa-enforce` |
| 日志 | 集中收日志、异地留存 | rsyslog 远程转发 |

## 10. 本章小结

- 八进制 `chmod`（r=4/w=2/x=1）+ `umask` 决定文件初始权限；`sticky bit` 让共享目录只能删自己的文件；`setuid` 让程序临时获得属主身份——`passwd` 就是活例子。
- 标准 rwx 不够用时上 **ACL**（`setfacl` 给指定用户授权）、再不够用 **capabilities**（`setcap` 只给单项能力，如 ping 只要 `cap_net_raw`）。
- `visudo` 精确控制提权；SSH 用密钥 + 禁密码 + fail2ban；防火墙默认拒绝放行必要端口。
- `auditd` 记录"谁在何时改了什么"；SELinux/AppArmor 提供属主都改不了的强制访问控制。
- 安全三原则贯穿全篇：**最小权限、纵深防御、可审计**。

## 11. 动手实验

1. **umask 与默认权限**：依次执行 `umask 022`、`umask 077` 后各 `touch f1; ls -l f1`，对比新文件权限，理解默认权限公式。
2. **setuid 实验**（虚拟机）：按 1.4 节复制 `/bin/cat` 并 `chmod u+s`，用普通用户执行，对比它与原 cat 能否读 `/etc/shadow`，最后恢复/删除该实验文件。
3. **ACL 实验**：创建 `report.txt`，`setfacl -m u:alice:rw report.txt` 后用 alice 身份读写、用 bob 身份拒绝访问，再 `getfacl`/`setfacl -b` 验证。
4. **capabilities 实验**：`getcap /usr/bin/ping` 观察；若无则 `sudo setcap cap_net_raw+ep /usr/bin/ping` 后用 `capsh --print` 查看。用 `getpcaps <任意进程>` 了解常见进程的能力集合。
5. **auditd 实验**：配置 `auditctl -w /etc/hostname -p wa -k hostname_change`，另开终端 `echo test >> /etc/hostname`（需 root），再用 `ausearch -k hostname_change -i` 查到这次写入事件，最后清理规则。

## 12. 自测题

1. **为什么 `passwd` 能让普通用户修改只允许 root 写的 `/etc/shadow`？** 因为 passwd 是 setuid root 程序：执行时进程 effective uid 临时变为 root，因此能写 shadow；设计上只开放"改自己密码"这一个入口。
2. **sticky bit 的作用与适用场景？** 允许所有人写目录，但只允许删除自己属主的文件；典型是 `/tmp`，防止互相删临时文件。
3. **ACL 与 setuid 分别解决什么问题？** ACL 解决"rwx 三类太粗，需要给指定用户单独权限"；setuid 解决"普通用户需要临时提权执行高权限操作"。二者一个管授权粒度、一个管提权方式。
4. **`ping` 只需要 `cap_net_raw`，为什么不用 setuid 全部 root？** 能力最小化：setcap 只给原始套接字能力，即使 ping 被攻破，攻击者也没有 mount/加载内核模块等 root 级能力，攻击面大大缩小。
5. **auditd 能记录什么、查什么？** 记录关键文件的读写/属性变更与系统调用执行；`ausearch` 查明细（谁、何时、什么操作）、`aureport` 出汇总报告，是"谁动了关键文件"的审计证据。
