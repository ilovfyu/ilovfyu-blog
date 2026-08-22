---
title: "Linux 命令场景与字母索引"
permalink: /kb/os/Bash/21-Linux命令场景与字母索引/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "现代高效命令行工具", link: /kb/os/Bash/20-现代高效命令行工具/ }
next: false
knowledgeNote:
  series: "OS"
  group: "Bash"
---
::: abstract 本章定位
本篇不是重复讲解命令，而是整套 Bash 笔记的检索入口。第一部分按“我现在要解决什么问题”查命令，第二部分按命令首字母反查详细笔记。遇到陌生命令时，先在这里确定类别，再进入对应专题阅读参数、输出、风险和实验。
:::

## 1. 使用方法

这套笔记把命令分成四层：

| 层次 | 解决的问题 | 阅读入口 |
|---|---|---|
| 核心操作 | 文件、文本、进程、权限怎么操作 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) 至 [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 系统管理 | 磁盘、网络、监控、服务怎么管理 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) 至 [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/)、[服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 高级诊断 | 系统为什么慢、程序为什么崩、网络为什么不通 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/)、[防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/)、[内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 效率增强 | 结构化数据、现代 CLI、命令组合怎么提效 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) 至 [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |

::: tip 推荐查找顺序
先按第 2 节的场景找到 2 至 4 个候选命令，再到对应专题确认参数。不要看到命令名就直接复制执行，磁盘、权限、防火墙、内核参数类命令尤其要先读 warning。
:::

## 2. 按场景查命令

### 2.1 文件与目录

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 查看当前目录 | `pwd` | `realpath .` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 切换目录 | `cd` | `pushd`、`popd`、`dirs`、`zoxide` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 列出文件 | `ls -lah` | `tree`、`eza`、`lsd` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 创建文件或目录 | `touch`、`mkdir -p` | `install -d`、`mktemp` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 复制或移动 | `cp -a`、`mv` | `install`、`rsync` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| 删除文件 | `rm`、`rmdir` | `find -delete`、`shred` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 创建链接 | `ln`、`ln -s` | `readlink`、`realpath` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 查看文件类型 | `file` | `stat`、`readelf` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 查看元数据 | `stat` | `ls -li`、`getfattr`、`getfacl` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 拆路径 | `basename`、`dirname` | `realpath`、`readlink -f` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 截断或预分配 | `truncate` | `fallocate`、`dd` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 拆分大文件 | `split`、`csplit` | `cat` 合并 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 创建命名管道 | `mkfifo` | `pipe`、`socat` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[网络命令](/kb/os/Bash/06-网络命令/) |

### 2.2 查看、搜索与处理文本

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 查看小文件 | `cat` | `tac`、`nl` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 分页看大文件 | `less` | `more`、`bat` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 看开头或结尾 | `head`、`tail` | `tail -f` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| 按内容搜索 | `grep` | `rg`、`awk` | [文本处理三剑客](/kb/os/Bash/02-文本处理三剑客/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 查找文件 | `find` | `locate`、`fd` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 按列提取 | `awk` | `cut`、`choose` | [文本处理三剑客](/kb/os/Bash/02-文本处理三剑客/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 替换或删除行 | `sed` | `awk`、`perl -pe` | [文本处理三剑客](/kb/os/Bash/02-文本处理三剑客/) |
| 排序去重统计 | `sort`、`uniq -c` | `awk`、`mlr` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| 横向合并 | `paste`、`join` | `column` | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| 比较文件 | `diff -u`、`cmp` | `comm`、`patch` | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| 对齐与排版 | `column`、`fmt`、`fold` | `pr`、`expand`、`unexpand` | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| 转换字符 | `tr` | `iconv`、`dos2unix` | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| 批量传参 | `xargs` | GNU `parallel` | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 同时看和保存 | `tee` | `sponge` | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |

### 2.3 JSON、YAML、XML 与 CSV

| 数据格式 | 首选命令 | 常见用途 | 详细笔记 |
|---|---|---|---|
| JSON | `jq` | 字段过滤、数组统计、格式转换 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| YAML | `yq` | 配置读取、原地修改、JSON 转换 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| XML | `xmllint`、`xmlstarlet` | XPath 查询、格式化、编辑 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| CSV | `csvcut`、`csvgrep`、`csvstat` | 选列、过滤、统计、连接 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| 多格式流 | `mlr`、`dasel` | CSV/TSV/JSON 转换与分组 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| 生成 JSON | `jo` | Shell 参数转 JSON | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| 命令输出转 JSON | `jc` | 把 `ps`、`df` 等输出结构化 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |

### 2.4 进程、线程与作业

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 列进程 | `ps` | `procs`、`pstree` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 找 PID | `pgrep` | `pidof`、`ps -C` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| 动态看进程 | `top` | `htop`、`btop`、`atop` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 按进程采样 | `pidstat` | `top -H`、`perf stat` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 看线程 | `ps -L`、`pidstat -t` | `/proc/PID/task` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| 发信号 | `kill` | `pkill`、`killall` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| 前后台切换 | `jobs`、`fg`、`bg` | `disown` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| 脱离终端 | `nohup`、`setsid` | `systemd-run`、`tmux` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| 调 CPU 优先级 | `nice`、`renice` | `chrt`、`taskset` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| 调 IO 优先级 | `ionice` | cgroup IO 控制 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看资源限制 | `ulimit`、`prlimit` | `/proc/PID/limits` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| 看进程内存 | `pmap -x` | `smem`、`/proc/PID/smaps` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 看进程打开对象 | `lsof -p` | `/proc/PID/fd`、`fuser` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[文件描述符](/kb/os/Linux/15-文件描述符详解/) |
| 进入 namespace | `nsenter` | `lsns`、`unshare` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |

### 2.5 CPU、内存与性能监控

| 资源 | 快速总览 | 深入工具 | 详细笔记 |
|---|---|---|---|
| 负载 | `uptime`、`top` | `sar -q`、`pidstat` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 每核 CPU | `mpstat -P ALL` | `perf`、`turbostat` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/)、[调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| CPU 热点 | `pidstat -u` | `perf top/record`、`bpftrace` | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 内存 | `free -h`、`vmstat` | `smem`、`pmap`、`slabtop` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| NUMA | `numastat` | `numactl --hardware` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 页缓存 | `free`、`/proc/meminfo` | `vmtouch`、`pcstat` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 电源与频率 | `cpupower` | `turbostat`、`powertop` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 历史指标 | `sar` | `atop`、`nmon` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 基准测试 | `time` | `hyperfine`、`stress-ng` | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |

### 2.6 磁盘、分区与文件系统

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 看块设备 | `lsblk`、`blkid` | `lsscsi`、`nvme list` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 看挂载 | `findmnt` | `mount`、`mountpoint` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 看空间 | `df -h`、`du -sh` | `ncdu`、`dust`、`duf` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 管分区 | `fdisk`、`parted` | `gdisk`、`sgdisk`、`growpart` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 建文件系统 | `mkfs` | `mke2fs`、`mkfs.xfs` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 检查修复 | `fsck` | `e2fsck`、`xfs_repair`、`btrfs check` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 看 ext 文件系统 | `tune2fs`、`dumpe2fs` | `debugfs`、`e2label` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 扩容 | `growpart` | `resize2fs`、`xfs_growfs`、`lvextend` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| LVM | `pvs/vgs/lvs` | `pvcreate`、`vgcreate`、`lvcreate` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| RAID | `mdadm` | `/proc/mdstat` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 加密磁盘 | `cryptsetup` | `dmsetup` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| 健康检查 | `smartctl` | `nvme smart-log`、`badblocks` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| IO 性能 | `iostat -x` | `fio`、`blktrace`、`biolatency` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/)、[调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| SSD 回收 | `fstrim` | `systemctl status fstrim.timer` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |

### 2.7 网络、远程连接与防火墙

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 看地址和路由 | `ip addr`、`ip route` | `nmcli`、`networkctl` | [网络命令](/kb/os/Bash/06-网络命令/) |
| 看监听和连接 | `ss -tunlp` | `lsof -i`、`nstat` | [网络命令](/kb/os/Bash/06-网络命令/) |
| 测连通 | `ping`、`tracepath` | `traceroute`、`mtr`、`arping` | [网络命令](/kb/os/Bash/06-网络命令/) |
| 查 DNS | `dig` | `host`、`resolvectl`、`whois` | [网络命令](/kb/os/Bash/06-网络命令/) |
| HTTP 请求 | `curl` | `wget`、`httpie`、`xh` | [网络命令](/kb/os/Bash/06-网络命令/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 测端口 | `nc -zv` | `socat`、`telnet`、`nmap` | [网络命令](/kb/os/Bash/06-网络命令/) |
| 测带宽 | `iperf3` | `nload`、`iftop`、`bandwhich` | [网络命令](/kb/os/Bash/06-网络命令/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 抓包 | `tcpdump` | `tshark`、Wireshark | [网络命令](/kb/os/Bash/06-网络命令/) |
| 看网卡 | `ethtool` | `ip -s link`、`lspci -k` | [网络命令](/kb/os/Bash/06-网络命令/)、[内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 管桥接和流控 | `bridge`、`tc` | `ip link` | [网络命令](/kb/os/Bash/06-网络命令/) |
| SSH 登录 | `ssh` | `mosh`、`autossh` | [远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| 传文件 | `scp`、`sftp` | `rsync`、`rclone`、`sshfs` | [远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| 会话保活 | `tmux` | `screen`、`mosh` | [远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| 防火墙 | `nft` | `iptables`、`firewall-cmd`、`ufw` | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| 连接跟踪 | `conntrack` | `nft monitor trace` | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| 自动封禁 | `fail2ban-client` | nft set、ipset | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |

### 2.8 用户、权限与安全

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 创建用户 | `useradd` | `adduser`、`usermod`、`userdel` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 管组 | `groupadd`、`gpasswd` | `newgrp`、`groupmems` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 查账号 | `id`、`getent` | `groups`、`whoami` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 管密码 | `passwd` | `chage`、`chpasswd`、`faillock` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 改权限 | `chmod` | `chown`、`chgrp`、`umask` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 查路径权限 | `namei -l` | `getfacl`、`ls -ld` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 扩展 ACL | `setfacl` | `getfacl` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 管 capability | `setcap`、`getcap` | `capsh`、`setpriv` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/)、[内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 切换身份 | `sudo`、`su` | `runuser`、`setpriv` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| 看登录历史 | `last` | `lastb`、`lastlog`、`loginctl` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/)、[时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 审计 | `auditctl` | `ausearch`、`aureport` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |

### 2.9 服务、日志与定时任务

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 启停服务 | `systemctl` | `service`、`systemd-run` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 开机自启 | `systemctl enable` | `chkconfig` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 查系统日志 | `journalctl` | `dmesg`、`logger` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/)、[内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 管日志轮转 | `logrotate` | `journalctl --vacuum-*` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 周期任务 | `crontab` | `anacron`、systemd timer | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 一次性任务 | `at` | `batch`、`systemd-run --on-active` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 关机重启 | `shutdown`、`reboot` | `poweroff`、`halt` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 广播消息 | `wall` | `write`、`mesg` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |

### 2.10 内核、模块、硬件与 namespace

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 看内核版本 | `uname -a` | `/proc/version`、`hostnamectl` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看内核日志 | `dmesg` | `journalctl -k` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 查改内核参数 | `sysctl` | `/proc/sys` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看模块 | `lsmod` | `modinfo`、`/proc/modules` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 加载卸载模块 | `modprobe` | `insmod`、`rmmod`、`depmod` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看 CPU/内存硬件 | `lscpu`、`lsmem` | `dmidecode`、`lshw`、`inxi` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看 PCI/USB | `lspci`、`lsusb` | `udevadm` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看 namespace | `lsns` | `nsenter`、`unshare` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看 cgroup | `systemd-cgls` | `systemd-cgtop`、`systemd-run --scope` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| 看中断 | `/proc/interrupts` | `irqtop`、`irqbalance` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |

### 2.11 调试、追踪与二进制分析

| 问题 | 首选命令 | 进一步工具 | 详细笔记 |
|---|---|---|---|
| 卡在哪个系统调用 | `strace` | `perf trace`、`bpftrace` | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 卡在哪个库函数 | `ltrace` | `gdb` | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 崩溃与 core | `coredumpctl`、`gdb` | `eu-stack`、`addr2line` | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| CPU 热点 | `perf top` | `perf record`、火焰图 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| IO 延迟 | `biolatency` | `blktrace`、`perf` | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 内存错误 | `valgrind` | ASan、heaptrack | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 动态内核追踪 | `bpftrace` | BCC、`trace-cmd`、ftrace | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 判断二进制类型 | `file` | `readelf -h` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 看动态依赖 | `readelf -d` | `ldd`、`ldconfig -p` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 反汇编 | `objdump -d` | `gdb disassemble` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 看符号 | `nm` | `readelf -s`、`c++filt` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 地址转源码行 | `addr2line` | `eu-addr2line` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 完整性校验 | `sha256sum` | `debsums`、`rpm -V` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| TLS/证书 | `openssl` | `curl -v` | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |

### 2.12 包管理、构建与安装

| 发行版/场景 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| Debian/Ubuntu | `apt` | `apt-cache`、`apt-mark`、`dpkg` | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| RHEL/Fedora | `dnf` | `yum`、`rpm`、`repoquery` | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| openSUSE | `zypper` | `rpm` | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| Arch | `pacman` | AUR helper（谨慎） | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| Flatpak/Snap | `flatpak`、`snap` | AppImage | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| 源码构建 | `configure`、`make` | `cmake`、`ninja`、`pkg-config` | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| 动态库缓存 | `ldconfig` | `LD_LIBRARY_PATH`、`patchelf` | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/)、[二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |

### 2.13 Shell、终端、时间与环境

| 想做什么 | 首选命令 | 相关命令 | 详细笔记 |
|---|---|---|---|
| 写脚本 | `bash` | `shellcheck`、`shfmt` | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| 读参数 | `getopts` | `shift`、位置参数 | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| 处理并发 | `wait` | `coproc`、GNU `parallel` | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| 防重复执行 | `flock` | PID file | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| 查环境 | `env`、`printenv` | `set`、`declare`、`export` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 查命令来源 | `type`、`command -V` | `which`、`whereis`、`hash` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 管 locale | `locale` | `localectl`、`locale-gen` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 管时间 | `date`、`timedatectl` | `chronyc`、`hwclock` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 查终端 | `tty`、`stty` | `tput`、`reset` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 录制终端 | `script` | `scriptreplay`、`scriptlive` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| 查历史 | `history` | `fc`、`Ctrl+R` | [实用命令组合与技巧](/kb/os/Bash/10-实用命令组合与技巧/)、[时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |

## 3. 常见问题快速入口

| 现象 | 第一条命令 | 第二步 | 详细笔记 |
|---|---|---|---|
| 机器很慢 | `uptime; vmstat 1 5` | `pidstat -u -r -d -w 1 5` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| CPU 很高 | `top -H` | `perf top -p PID` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 内存一直涨 | `free -h; pidstat -r 1` | `pmap -x PID`、`smem` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| 磁盘满了 | `df -h; df -i` | `du -xah / | sort -h`、`lsof +L1` | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| IO 很慢 | `iostat -x 1` | `pidstat -d 1`、`biolatency` | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/)、[调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 端口连不上 | `ss -lntp` | `nft list ruleset`、`tcpdump` | [网络命令](/kb/os/Bash/06-网络命令/)、[防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| DNS 异常 | `resolvectl status` | `dig +trace 域名` | [网络命令](/kb/os/Bash/06-网络命令/) |
| 服务起不来 | `systemctl status UNIT` | `journalctl -u UNIT -b` | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| 进程卡住 | `ps -o pid,stat,wchan,cmd -p PID` | `strace -p PID` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| 文件删了空间没回来 | `lsof +L1` | 重开日志或重启持有进程 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| Permission denied | `namei -l 路径` | `getfacl`、`getenforce` | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| Too many open files | `prlimit --pid PID --nofile` | `ls /proc/PID/fd | wc -l` | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)、[文件描述符](/kb/os/Linux/15-文件描述符详解/) |
| 动态库找不到 | `readelf -d 程序` | `ldconfig -p`、检查 RPATH | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| 内核模块加载失败 | `modprobe 模块` | `dmesg -T`、`modinfo` | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| JSON/YAML 改错 | `jq empty`、`yq eval` | 格式化后 diff | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| 时间不准 | `timedatectl` | `chronyc tracking; chronyc sources -v` | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |

## 4. 字母索引

::: note 索引规则
同一命令只列最主要的详解篇；命令可能在其他篇作为组合示例再次出现。非默认安装的现代工具集中在 [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/)。
:::

### A-C

| 命令 | 用途 | 详解 |
|---|---|---|
| `addr2line` | 地址映射到源码行 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `alias` | 命令别名 | [实用命令组合与技巧](/kb/os/Bash/10-实用命令组合与技巧/) |
| `anacron` | 补跑周期任务 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `apt` / `apt-cache` / `apt-mark` | Debian 包管理 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| `ar` / `ranlib` | 静态库归档与索引 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `arping` | 二层邻居探测 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `at` / `atq` / `atrm` | 一次性定时任务 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `atop` | 历史系统监控 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `auditctl` / `ausearch` / `aureport` | 内核审计 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `awk` | 字段处理与统计 | [文本处理三剑客](/kb/os/Bash/02-文本处理三剑客/) |
| `badblocks` | 坏块检测 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `basename` | 取路径末尾 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `bash` | Shell 与脚本执行 | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| `bat` | 带高亮的文件查看 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `bc` | 高精度计算 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `bpftrace` | eBPF 动态追踪 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| `bridge` | Linux bridge 管理 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `btop` | 现代资源监控 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `btrfs` | Btrfs 管理 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `capsh` | capability 检查 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `cat` / `tac` | 查看或反向查看文本 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `cd` / `pushd` / `popd` | 目录导航 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `chage` / `chpasswd` | 密码生命周期与批量修改 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `chmod` / `chown` / `chgrp` | 权限和属主 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `chrt` | 实时调度策略 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `chronyc` | NTP/chrony 管理 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `cmake` / `ninja` | 构建系统 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| `cmp` / `comm` | 文件与集合比较 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `column` | 表格对齐 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `conntrack` | 连接跟踪表 | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| `cp` / `mv` / `rm` | 文件复制移动删除 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `cpupower` | CPU 频率与电源策略 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `crontab` | 周期任务 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `cryptsetup` | LUKS 磁盘加密 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `curl` | HTTP/API 请求 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `cut` | 按分隔符取列 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |

### D-H

| 命令 | 用途 | 详解 |
|---|---|---|
| `date` | 时间显示与转换 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `dd` | 块复制和镜像 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `debugfs` | ext 文件系统调试 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `depmod` | 生成模块依赖 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `df` / `du` | 文件系统与目录空间 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `dig` / `host` | DNS 查询 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `dirname` | 取父路径 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `dmesg` | 内核环形日志 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `dmidecode` | DMI 硬件信息 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `dmsetup` | device-mapper 管理 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `dnf` / `yum` / `rpm` | RPM 系包管理 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| `dos2unix` | 换行格式转换 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `dpkg` / `dpkg-query` | Debian 底层包管理 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| `duf` / `dust` | 现代磁盘空间查看 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `e2fsck` / `tune2fs` / `dumpe2fs` | ext 检查与参数 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `env` / `printenv` | 环境变量 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `ethtool` | 网卡参数与统计 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `eza` / `lsd` | 现代 ls | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `factor` | 质因数分解 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `fail2ban-client` | 自动封禁管理 | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| `fd` | 现代 find | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `fdisk` / `parted` / `gdisk` | 分区管理 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `file` | 识别文件类型 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `find` / `locate` | 文件查找 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `findmnt` | 查询挂载树 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `fio` | IO 基准测试 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `firewall-cmd` | firewalld 管理 | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| `flock` | 文件锁与防重复执行 | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| `free` | 内存总览 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `fsck` | 文件系统检查 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `fstrim` | SSD TRIM | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `fuser` | 从文件或端口找进程 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `fzf` | 模糊选择器 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `gdb` | 断点与 core 调试 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| `getcap` / `setcap` | capability 管理 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `getent` | NSS 数据查询 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `getfacl` / `setfacl` | ACL 管理 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `grep` / `rg` | 文本搜索 | [文本处理三剑客](/kb/os/Bash/02-文本处理三剑客/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `groupadd` / `gpasswd` | 组管理 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `growpart` | 扩分区 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `head` / `tail` | 看文件首尾 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `history` / `fc` | Shell 历史 | [实用命令组合与技巧](/kb/os/Bash/10-实用命令组合与技巧/) |
| `hostnamectl` | 主机名与系统信息 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `htop` / `atop` | 交互式进程监控 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `hwclock` | RTC 硬件时间 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |

### I-P

| 命令 | 用途 | 详解 |
|---|---|---|
| `iconv` | 字符编码转换 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `id` | UID/GID/组查询 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `ionice` | IO 优先级 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `ip` | 地址、路由、链路、邻居 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `iperf3` | 网络带宽测试 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `iptables` / `nft` | 防火墙与 NAT | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| `iostat` | 块设备 IO 统计 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `iotop` | 按进程看 IO | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `jq` / `yq` | JSON/YAML 处理 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| `jobs` / `fg` / `bg` | 作业控制 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `journalctl` | systemd 日志查询 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `kill` / `pkill` / `pgrep` | 信号与进程匹配 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `ldconfig` / `ldd` | 动态库缓存与依赖 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `less` | 大文件分页 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `ln` / `readlink` | 链接创建与解析 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `locale` / `localectl` | locale 管理 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `logger` | 写入系统日志 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `loginctl` | systemd 登录会话 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `logrotate` | 日志轮转 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `losetup` | loop 设备 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `ls` / `tree` | 文件列表与目录树 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `lsblk` / `blkid` | 块设备与 UUID | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `lscpu` / `lsmem` | CPU 与内存硬件 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `lsmod` / `modinfo` | 内核模块查询 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `lsns` / `nsenter` | namespace 查询与进入 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `lsof` | 打开的文件/socket | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `lspci` / `lsusb` | PCI/USB 设备 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `make` / `cmake` / `ninja` | 源码构建 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| `mdadm` | Linux 软件 RAID | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `mkfs` | 创建文件系统 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `mktemp` | 安全临时文件 | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| `mlr` / `csvkit` | CSV/TSV/JSON 流处理 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| `modprobe` / `insmod` / `rmmod` | 加载卸载模块 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `mount` / `umount` | 挂载与卸载 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `mpstat` | 每核 CPU 统计 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `mtr` / `tracepath` | 网络路径诊断 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `nc` / `socat` | 端口测试与流转发 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `nice` / `renice` | CPU 调度权重 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `nm` / `readelf` / `objdump` | ELF 分析 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `nohup` / `setsid` | 脱离终端运行 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `numactl` / `numastat` | NUMA 管理 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `openssl` | 摘要、密钥、证书、TLS | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `pmap` | 进程内存映射 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `perf` | 性能采样与追踪 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| `pidstat` | 按进程采样资源 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `ping` / `arping` | 三层/二层探测 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `prlimit` / `ulimit` | 资源限制 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `ps` / `pstree` | 进程快照与树 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `pwd` | 当前目录 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |

### R-Z

| 命令 | 用途 | 详解 |
|---|---|---|
| `readelf` / `objdump` | ELF 结构与反汇编 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `realpath` / `readlink` | 路径规范化 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `reboot` / `shutdown` / `poweroff` | 系统重启关机 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `rename` | 批量改名 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `resize2fs` / `xfs_growfs` | 文件系统扩容 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `resolvectl` / `dig` | DNS 状态与查询 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `rg` / `fd` / `fzf` | 现代搜索工具 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `rpm` / `dnf` | RPM 包管理 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |
| `rsync` | 增量同步 | [远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| `sar` | sysstat 历史监控 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `scp` / `sftp` / `ssh` | 远程与传输 | [远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| `sed` | 流式文本编辑 | [文本处理三剑客](/kb/os/Bash/02-文本处理三剑客/) |
| `sha256sum` | 文件完整性摘要 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `shellcheck` / `shfmt` | Shell 静态检查与格式化 | [Shell脚本编程进阶](/kb/os/Bash/08-Shell脚本编程进阶/) |
| `smartctl` | 磁盘 SMART | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `sort` / `uniq` | 排序去重统计 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `split` / `csplit` | 文件拆分 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `ss` | socket 与监听 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `stat` | 文件元数据 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `strace` / `ltrace` | 系统调用与库调用 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| `strings` / `hexdump` / `xxd` | 二进制可读信息 | [二进制与安全审计命令](/kb/os/Bash/16-二进制与安全审计命令/) |
| `stty` / `tput` / `reset` | 终端控制 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `su` / `sudo` / `runuser` | 身份切换 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `swapoff` / `swapon` | swap 管理 | [磁盘与文件系统命令](/kb/os/Bash/05-磁盘与文件系统命令/) |
| `sysctl` | 内核参数 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `systemctl` / `journalctl` | 服务与日志 | [服务管理与定时任务](/kb/os/Bash/12-服务管理与定时任务/) |
| `tar` / `gzip` / `xz` | 归档压缩 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `taskset` / `chrt` / `ionice` | CPU/实时/IO 调度 | [进程与作业控制](/kb/os/Bash/03-进程与作业控制/) |
| `tc` / `bridge` | 流量控制与桥接 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `tcpdump` / `tshark` | 抓包分析 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `tee` / `sponge` | 分流和安全覆写 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `time` / `hyperfine` | 命令耗时基准 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `timedatectl` / `chronyc` | 时间同步 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `tmux` / `screen` | 终端复用 | [远程操作与文件同步](/kb/os/Bash/11-远程操作与文件同步/) |
| `top` / `htop` / `btop` | 动态监控 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `touch` / `truncate` | 文件与尺寸 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `tr` / `iconv` | 字符与编码转换 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/)、[高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `udevadm` | udev 设备事件 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `ufw` / `firewall-cmd` | 防火墙前端 | [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/) |
| `uname` | 内核与架构 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `unshare` / `nsenter` | namespace 创建与进入 | [内核模块硬件与系统参数命令](/kb/os/Bash/17-内核模块硬件与系统参数命令/) |
| `useradd` / `usermod` / `userdel` | 用户管理 | [权限与用户管理](/kb/os/Bash/04-权限与用户管理/) |
| `valgrind` | 内存错误检测 | [调试与追踪工具](/kb/os/Bash/13-调试与追踪工具/) |
| `vmstat` | CPU/内存/IO 总览 | [系统监控与性能命令](/kb/os/Bash/07-系统监控与性能命令/) |
| `watch` / `entr` / `watchexec` | 周期或事件触发 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `wc` | 行词字节统计 | [核心命令与文件操作](/kb/os/Bash/01-核心命令与文件操作/) |
| `wget` | 下载 | [网络命令](/kb/os/Bash/06-网络命令/) |
| `who` / `w` / `last` | 登录会话 | [时间终端与环境管理命令](/kb/os/Bash/19-时间终端与环境管理命令/) |
| `xargs` / `parallel` | 批量与并行 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/)、[现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `xmllint` / `xmlstarlet` | XML 处理 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| `yes` / `seq` | 重复输入与序列 | [高级命令与文本处理](/kb/os/Bash/09-高级命令与文本处理/) |
| `yq` / `jq` | YAML/JSON 处理 | [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/) |
| `zoxide` | 智能目录跳转 | [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/) |
| `zypper` / `pacman` | openSUSE/Arch 包管理 | [包管理与软件安装](/kb/os/Bash/14-包管理与软件安装/) |

## 5. 最小必会清单

如果时间有限，先熟练下面 50 个命令：

```text
文件：pwd cd ls mkdir touch cp mv rm ln find file stat du df
文本：cat less head tail grep sed awk sort uniq cut tr wc tee
进程：ps top pidstat pgrep kill jobs fg bg nohup lsof
系统：free vmstat iostat sar systemctl journalctl dmesg sysctl
网络：ip ss ping dig curl ssh rsync tcpdump
权限：id chmod chown sudo getent
```

掌握标准不是“背出所有选项”，而是：

1. 能说出命令解决什么问题。
2. 能使用 `man`、`--help` 找到陌生参数。
3. 能读懂典型输出里的关键列。
4. 能判断命令是否有破坏性以及是否需要 root。
5. 能把两个以上命令通过管道、重定向或脚本组合起来。

## 6. 本章小结

- 按场景查命令比背命令名有效：先明确对象是文件、进程、网络、磁盘还是内核。
- 同一个问题通常有“快照 → 采样 → 追踪”三级工具，例如 `ps` → `pidstat` → `perf/strace`。
- 经典命令是脚本兼容性的基础，现代工具用于交互提效；团队脚本优先经典工具并准备降级方案。
- 高风险操作要先备份、干跑或准备回滚，尤其是磁盘、防火墙、权限、内核参数和远程连接。
- 找不到命令时先查本索引，再读对应篇的参数、输出和实验，不要直接复制网络片段。

## 7. 自测题

1. 想找出某个 PID 的 CPU、内存、IO 和上下文切换，应使用什么？答：`pidstat -u/-r/-d/-w -p PID 1 5`，详见 [进程与作业控制](/kb/os/Bash/03-进程与作业控制/)。
2. `df` 显示磁盘满但 `du` 找不到大文件，下一步是什么？答：`lsof +L1` 查已删除但仍被进程持有的文件。
3. 修改 JSON 和 YAML 分别优先使用什么？答：`jq` 与 Mike Farah `yq`，详见 [结构化数据处理命令](/kb/os/Bash/18-结构化数据处理命令/)。
4. SSH 修改防火墙前如何防止把自己锁在外面？答：保留第二连接并设置定时回滚，再验证新连接，详见 [防火墙与网络安全命令](/kb/os/Bash/15-防火墙与网络安全命令/)。
5. 服务启动失败的标准三步是什么？答：`systemctl status` → `journalctl -u` → 手工执行 `ExecStart` 复现。
6. 要确认命令到底是 alias、函数、内建还是外部程序，用什么？答：`type -a COMMAND` 或 `command -V COMMAND`。
7. 要分析不可信 ELF 的依赖，为何不应先用 `ldd`？答：部分实现可能触发加载器行为；优先使用 `readelf -d` 或 `objdump -p` 静态查看。
8. `rg`、`fd`、`fzf` 各替代或增强什么？答：分别增强 `grep`、`find` 和交互式模糊选择，详见 [现代高效命令行工具](/kb/os/Bash/20-现代高效命令行工具/)。
