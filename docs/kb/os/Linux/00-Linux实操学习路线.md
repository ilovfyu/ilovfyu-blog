---
title: "Linux 实操学习路线"
permalink: /kb/os/Linux/00-Linux实操学习路线/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "Linux 进程与调度实操", link: /kb/os/Linux/01-Linux进程与调度实操/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
本目录是《Operating System Concepts》第 9 版的"Linux 落地篇"：教材讲**机制与算法**，这里讲**怎么在 Linux 上看到它、量它、调它**。每篇都把进程、内存、文件系统、IO、网络、安全六大主题映射成一组可运行的命令，目标是让你拿到一台 Linux 机器，能用 `ps`/`free`/`iostat`/`strace` 等工具亲手验证教材里学到的每一个概念。
:::

教材告诉你"进程有就绪/运行/等待状态"，`ps` 的 `STAT` 列让你**看见**这些状态；教材告诉你"缓存加速 IO"，`free` 的 `buff/cache` 列让你**量到**缓存；教材告诉你"系统调用是内核入口"，`strace` 让你**抓到**每一次调用。本目录就是把"书上的话"变成"手上的命令"。

## 1. 主题地图

| 编号 | 主题 | 对应教材章节 | 核心问题 | 核心命令 |
|---|---|---|---|---|
| [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) | 进程与调度 | Ch3 Processes · Ch5 CPU Scheduling | 进程是什么状态？谁在占用 CPU？怎么调度？ | `ps` `top` `htop` `pstree` `kill` `nice` `renice` `/proc` |
| [Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/) | 内存管理 | Ch8 Main Memory · Ch9 Virtual Memory | 内存被谁用了？虚拟内存如何工作？swap 和 OOM 怎么回事？ | `free` `vmstat` `top` `pmap` `/proc/meminfo` `/proc/&lt;pid&gt;/maps` |
| [Linux文件系统与磁盘实操](/kb/os/Linux/03-Linux文件系统与磁盘实操/) | 文件系统 | Ch13-15 File System | 磁盘空间与 inode 怎么查？硬/软链接什么区别？文件怎么找？ | `df` `du` `stat` `ln` `lsblk` `find` `chattr` `inotifywait` |
| [LinuxIO与性能监控实操](/kb/os/Linux/04-LinuxIO与性能监控实操/) | IO 子系统 | Ch11 Mass-Storage · Ch12 I/O Systems | 磁盘忙不忙？读写瓶颈在哪？缓存 vs 直接 IO 差多少？ | `iostat` `sar` `iotop` `pidstat` `strace` `dd` `fio` |
| [Linux网络与系统调用实操](/kb/os/Linux/05-Linux网络与系统调用实操/) | 网络与系统调用 | Ch16 相关 + Linux 内核机制 | 连接处于什么状态？进程在调用什么？性能热点在哪？ | `ss` `lsof` `netstat` `traceroute` `strace` `gdb` `perf` `ulimit` |
| [Linux安全权限与审计](/kb/os/Linux/06-Linux安全权限与审计/) | 保护与安全 | Ch16 Protection · Ch17 Security | 权限怎么精细控制？setuid/ACL/capabilities 怎么用？如何审计？ | `chmod` `umask` `setfacl` `setcap` `visudo` `auditctl` `ufw` |
| [Linux内核架构与启动原理](/kb/os/Linux/07-Linux内核架构与启动原理/) | 内核架构与启动 | Ch1-2 概述与结构 | 内核怎么组织？如何从加电到 PID 1？系统调用机制什么样？ | `dmesg` `uname` `/proc/version` `ls /lib/modules` |
| [Linux进程与线程内核原理](/kb/os/Linux/08-Linux进程与线程内核原理/) | 进程/线程内核 | Ch3-4 进程与线程 | task_struct 里有什么？fork/COW 在内核怎么实现？线程为何是共享的进程？ | `ps -L` `/proc/&lt;pid&gt;/task` `pstree` |
| [Linux调度器原理](/kb/os/Linux/09-Linux调度器原理/) | 调度器原理 | Ch5 CPU Scheduling | CFS/EEVDF 如何算公平？nice 与权重怎么换算？负载均衡怎么做？ | `/proc/&lt;pid&gt;/sched` `chrt` `taskset` `perf sched` |
| [Linux内存管理内核原理](/kb/os/Linux/10-Linux内存管理内核原理/) | 内存内核原理 | Ch8-9 内存 | 四级页表怎么转换？buddy/slab 怎么分配？kswapd 何时回收？ | `/proc/buddyinfo` `slabtop` `perf stat` |
| [Linux文件系统内核原理](/kb/os/Linux/11-Linux文件系统内核原理/) | 文件系统内核 | Ch13-15 文件系统 | VFS 四大对象是什么？page cache 怎么工作？ext4 内部长什么样？ | `strace` `/proc/slabinfo` `filefrag` `dumpe2fs` |
| [LinuxIO栈内核原理](/kb/os/Linux/12-LinuxIO栈内核原理/) | IO 栈内核 | Ch11-12 存储与 IO | read() 到磁盘经过哪些层？blk-mq 为何快？io_uring 怎么免拷贝？ | `blktrace` `fio --ioengine=io_uring` `iostat -x` |
| [Linux网络栈内核原理](/kb/os/Linux/13-Linux网络栈内核原理/) | 网络栈内核 | Ch16 网络相关 + 内核 | socket 内核怎么实现？NAPI/软中断怎么收包？epoll 红黑树什么原理？ | `perf top` `/proc/softirqs` `ss -tin` `ethtool -S` |
| [Linux安全机制内核原理](/kb/os/Linux/14-Linux安全机制内核原理/) | 安全机制内核 | Ch16-17 保护与安全 | capabilities 集合怎么算？LSM 钩子在哪触发？seccomp 如何过滤 syscall？ | `getcap` `capsh` `auditctl` `seccomp` |
| [文件描述符详解](/kb/os/Linux/15-文件描述符详解/) | 文件描述符专题 | Ch3 进程 · Ch11 文件系统 | fd 是什么？dup/fork 如何共享？EMFILE/泄漏怎么排查？ | `lsof` `/proc/&lt;pid&gt;/fd` `ulimit -n` `strace` |

## 2. 推荐学习顺序

```
实操篇：01 进程与调度 ──→ 02 内存管理 ──→ 03 文件系统 ──→ 04 IO 与性能
     │                                                        │
     └──────────────→ 05 网络与系统调用 ◄── 06 安全与审计

原理篇：07 内核架构 ──→ 08 进程/线程内核 ──→ 09 调度器 ──→ 10 内存内核
     └──────→ 11 文件系统内核 ──→ 12 IO 栈 ──→ 13 网络栈 ──→ 14 安全机制

专题篇：15 文件描述符详解（可与任意实操篇并行阅读）
```

1. **[Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/)**（第一课）：进程是内核最重要的对象，`ps`/`top` 是你每天的起点。先学会"看进程"，再谈别的。
2. **[Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/)**（第二课）：进程背后是地址空间。搞懂 `VIRT/RES/SHR` 和 `/proc/meminfo`，才能诊断内存类问题。
3. **[Linux文件系统与磁盘实操](/kb/os/Linux/03-Linux文件系统与磁盘实操/)**（第三课）：磁盘是系统的"慢速记忆"。inode、链接、挂载是文件系统四大件。
4. **[LinuxIO与性能监控实操](/kb/os/Linux/04-LinuxIO与性能监控实操/)**（第四课）：把前几课的"观察"升级为"性能量化"，`iostat`/`strace`/`dd` 都是你的仪表盘。
5. **[Linux网络与系统调用实操](/kb/os/Linux/05-Linux网络与系统调用实操/)**（第五课）：网络状态机 + 系统调用跟踪 + 采样分析，是排查线上问题的三件套。
6. **[Linux安全权限与审计](/kb/os/Linux/06-Linux安全权限与审计/)**（第六课）：权限模型、安全能力、审计日志，是运维安全的基本功。
7. **[文件描述符详解](/kb/os/Linux/15-文件描述符详解/)**（第七课，随时可读）：把贯穿进程/文件系统/IO/网络的 fd 抽象一次讲透——三层结构、dup/fork 共享、EMFILE 与泄漏排查。

::: tip 两条路线
**面试向**：只读 01 → 02 → 03 → 15（外加 06 的权限与 setuid），重点是每个命令能读出什么；再把 07–14 原理篇粗读一遍建立"内核心智模型"。**实战向**：全读，且每篇的"动手实验"至少各做一遍——实验比笔记记得牢。
:::

## 3. 各篇一句话介绍

- [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/)——用 `ps -eo pid,stat,comm` 读出进程状态机，用 `top` 读懂 load average 与 CPU 百分比，用 `kill`/`nice` 干预调度，最后亲手制造一个僵尸进程亲眼看到 `Z`。
- [Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/)——用 `free` 看懂 `buff/cache` 与 `available` 的区别，用 `vmstat` 观察 swap 换入换出，用 `pmap` 和 `/proc/&lt;pid&gt;/maps` 看进程地址空间，用一段 `mmap` 的 C 代码理解虚拟内存。
- [Linux文件系统与磁盘实操](/kb/os/Linux/03-Linux文件系统与磁盘实操/)——用 `df -i` 发现 inode 耗尽这种"磁盘明明有空间却写不进"的坑，用 `ln` 实验硬链接与软链接的 inode 差异，用 `chattr +i` 给文件上"不可变锁"，用 `inotifywait` 实时监控文件变更。
- [LinuxIO与性能监控实操](/kb/os/Linux/04-LinuxIO与性能监控实操/)——用 `iostat` 看懂 `%util` 是不是真的"忙"，用 `strace -e trace=read,write` 抓系统调用，用 `dd`/`fio` 测磁盘吞吐，用 `oflag=direct` 亲手对比"带缓存"和"直写"的速度差。
- [Linux网络与系统调用实操](/kb/os/Linux/05-Linux网络与系统调用实操/)——用 `ss` 看 TCP 状态机，解释 `TIME_WAIT` 为什么必须存在，用 `strace -p` 挂到线上进程看它在干嘛，用 `perf top` 采样找到热点函数。
- [Linux安全权限与审计](/kb/os/Linux/06-Linux安全权限与审计/)——用八进制 `chmod` 和 `umask` 精确控制权限，做 `setuid`/`sticky bit` 实验，用 `setfacl`/`setcap` 做更细粒度的授权，最后用 `auditctl` 记录谁动了关键文件。
- [Linux内核架构与启动原理](/kb/os/Linux/07-Linux内核架构与启动原理/)——单体内核的取舍、用户态/内核态分离、系统调用机制（SYSCALL_DEFINEn）、从 BIOS 到 systemd 的启动全链路。
- [Linux进程与线程内核原理](/kb/os/Linux/08-Linux进程与线程内核原理/)——task_struct 字段拆解、fork/clone/exec 内核路径、COW 实现、线程 = 共享地址空间的进程、mm_struct 与 VMA。
- [Linux调度器原理](/kb/os/Linux/09-Linux调度器原理/)——从 O(1) 到 CFS 到 EEVDF，vruntime 加权、nice↔weight 换算、调度类金字塔、组调度与负载均衡。
- [Linux内存管理内核原理](/kb/os/Linux/10-Linux内存管理内核原理/)——四级页表转换、buddy/slab 分配器、缺页异常流程、kswapd 回收、OOM 选择。
- [Linux文件系统内核原理](/kb/os/Linux/11-Linux文件系统内核原理/)——VFS 四大对象、page cache 与写回、open/read/write 内核路径、ext4 块组与 extent。
- [LinuxIO栈内核原理](/kb/os/Linux/12-LinuxIO栈内核原理/)——read() 到磁盘全链路、bio/request、blk-mq 多队列、DMA、io_uring 双环。
- [Linux网络栈内核原理](/kb/os/Linux/13-Linux网络栈内核原理/)——socket 内核实现、NAPI/软中断收包、Netfilter、epoll 红黑树。
- [Linux安全机制内核原理](/kb/os/Linux/14-Linux安全机制内核原理/)——DAC vs MAC、capabilities 集合语义、LSM 钩子、seccomp、namespace 隔离。
- [文件描述符详解](/kb/os/Linux/15-文件描述符详解/)——fd 的三层结构（fd 表 → file 对象 → inode）、dup/fork/exec 的共享语义、/proc 观察、EMFILE 与 fd 泄漏排查。

## 4. 前置要求

建议先掌握以下基础（每条 5 分钟内能操作）：

- **命令怎么跑**：`ls`、`cd`、`pwd`、`cat`、`echo`、管道 `|`、重定向 `>`、`&` 后台执行。
- **文件与目录**：`cp`、`mv`、`rm`、`mkdir`、`touch`、`less`。
- **权限的基本概念**：`ls -l` 能看懂 `-rw-r--r--` 三段含义，知道 `sudo` 是提权。
- **一个趁手的编辑器**：`vim` 或 `nano`（改配置文件必用）。

::: important 别怕记不住
本目录的目的不是让你背命令，而是让你**建立"看到→理解"的反射**。遇到新命令先 `man <命令>` 或 `命令 --help`，本目录里的命令都遵循"看输出 → 逐列解释 → 动手验证"的套路。
:::

## 5. 实验环境建议

本目录所有命令默认在 **Linux** 上运行。macOS 的 `ps`/`top`/`free` 等工具与 Linux 差异较大（macOS 甚至没有 `/proc`），**请不要在 macOS 上直接跑本目录实验**。

| 方案 | 适合人群 | 优点 | 注意点 |
|---|---|---|---|
| **WSL2**（Windows 下） | Windows 用户 | 安装快（`wsl --install`）、与 Windows 文件互通、有 systemd 支持 | 缺真实硬件设备，部分 `/sys` 项不可用 |
| **虚拟机**（VirtualBox / VMware + Ubuntu/Debian/centos） | 需要完整内核体验 | 可自由折腾内核、磁盘、挂载、驱动 | 资源占用大 |
| **云主机**（阿里云/AWS 等临时开一台） | 追求真实生产环境 | 有真实磁盘/网卡/多核 | 按量计费，注意安全组 |
| **Linux 实体机 / 树莓派** | 进阶玩家 | 可测电源、NVMe、风扇等真实硬件行为 | 折腾有风险 |

```bash
# 环境自检：下面的命令如果都有输出，环境基本可用
uname -a                      # 确认是 Linux 内核
cat /etc/os-release | head -3 # 确认发行版
ls /proc/                     # 确认 /proc 存在
command -v ps top vmstat free strace ss   # 确认核心工具在 PATH 中
```

::: warning 需要 root 权限的命令
`mount`、`fsck`、`chattr +i`、`setcap`、`auditctl`、`sysctl`、`iostat -x` 等操作需要 root。实验用虚拟机/WSL 请直接 `sudo`，云主机请勿在真实生产机上做破坏性实验（如 `dd` 到磁盘）。
:::

## 6. 核心工具清单

| 工具 | 用途 | 教材概念 | 入门命令 |
|---|---|---|---|
| `ps` | 进程快照 | 进程状态、PCB | `ps -eo pid,stat,cmd` |
| `top` / `htop` | 动态进程视图 | 调度、优先级 | `top`（按 `P` 按 CPU 排序） |
| `pstree` | 进程树 | 父子关系 | `pstree -p` |
| `kill` / `killall` / `pkill` | 发信号 | 信号机制 | `kill -l` |
| `nice` / `renice` | 调度优先级 | 优先级与老化 | `nice -n -5 sleep 100 &` |
| `free` | 内存总量与缓冲 | 内存层次、page cache | `free -h` |
| `vmstat` | CPU/内存/IO 概览 | 就绪队列、换页 | `vmstat 1 5` |
| `pmap` | 进程内存映射 | 虚拟地址空间 | `pmap -x &lt;pid&gt;` |
| `iostat` | 磁盘吞吐与利用率 | IO 性能、%util | `iostat -x 1` |
| `pidstat` | 按进程统计资源 | 上下文切换、IO | `pidstat -w 1` |
| `sar` | 历史性能数据 | 性能趋势分析 | `sar -u 1` |
| `strace` | 系统调用跟踪 | 用户态→内核态 | `strace -e trace=read,write ls /tmp` |
| `perf` | 采样性能剖析 | CPU 热点、profiling | `perf top` |
| `lsof` | 打开文件/连接 | 打开文件表 | `lsof -i :80` |
| `ss` | 套接字状态 | TCP 状态机 | `ss -tn` |
| `df` / `du` | 磁盘空间 | 磁盘布局 | `df -h && du -sh ./*` |
| `stat` | 文件元数据 | inode、时间戳 | `stat /etc/passwd` |
| `find` / `locate` | 文件查找 | 目录遍历 | `find / -name '*.log' 2>/dev/null` |
| `dmesg` | 内核日志 | 内核消息、OOM | `dmesg -T \| tail` |
| `watch` | 定时刷新 | 动态观察 | `watch -n1 'ps -eo stat,cmd'` |

::: tip 安装缺失工具
Debian/Ubuntu：`sudo apt install sysstat iotop inotify-tools strace htop`；CentOS/RHEL：`sudo yum install sysstat iotop inotify-tools strace htop`。`fio`、`perf`（`linux-tools-common`）、`blktrace` 同样按发行版安装。
:::

## 7. 常见面试考点清单

| 考点 | 一句话要点 | 对应笔记 |
|---|---|---|
| 进程 vs 线程 | 进程是资源单位、线程是调度单位 | [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) |
| STAT 各字母含义 | R/S/D/T/Z/I，D 不可中断、Z 僵尸 | [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) |
| 僵尸 vs 孤儿 | 僵尸=已死未被回收，孤儿=父先死被 init 收养 | [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) |
| load average 过高 | 就绪+不可中断任务多，不只看 CPU | [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) |
| `free` 的 buff/cache 能否回收 | 可回收，`available` 才是真实可用 | [Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/) |
| VIRT/RES/SHR | 虚拟/常驻/共享，RES 才是实占物理内存 | [Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/) |
| swap 换入换出 | si/so，swap 是内存的"救火队"，频繁换出说明内存不足 | [Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/) |
| OOM Killer | 内存耗尽时内核选进程杀，`dmesg` 可见 | [Linux内存管理实操](/kb/os/Linux/02-Linux内存管理实操/) |
| 硬链接 vs 软链接 | 硬链接同 inode，软链接存路径 | [Linux文件系统与磁盘实操](/kb/os/Linux/03-Linux文件系统与磁盘实操/) |
| inode 耗尽 | `df -i`，小文件过多会耗尽 inode | [Linux文件系统与磁盘实操](/kb/os/Linux/03-Linux文件系统与磁盘实操/) |
| 文件三种时间戳 | atime/mtime/ctime，ctime 是 inode 变更时间 | [Linux文件系统与磁盘实操](/kb/os/Linux/03-Linux文件系统与磁盘实操/) |
| %util 高 ≠ 磁盘忙死 | 固态盘 %util 常"虚高"，要看 await | [LinuxIO与性能监控实操](/kb/os/Linux/04-LinuxIO与性能监控实操/) |
| iowait vs idle | iowait 是等 IO 的 CPU 空闲，属于"忙等" | [LinuxIO与性能监控实操](/kb/os/Linux/04-LinuxIO与性能监控实操/) |
| 缓存 vs direct IO | 页缓存加速读，direct IO 绕过缓存适合大数据顺序读写 | [LinuxIO与性能监控实操](/kb/os/Linux/04-LinuxIO与性能监控实操/) |
| TIME_WAIT 为什么存在 | 保证最后的 ACK 可重发、旧连接报文不会串台 | [Linux网络与系统调用实操](/kb/os/Linux/05-Linux网络与系统调用实操/) |
| 文件描述符耗尽 | `ulimit -n`，Too many open files 的根因 | [Linux网络与系统调用实操](/kb/os/Linux/05-Linux网络与系统调用实操/) |
| setuid 原理 | 运行时临时提升为属主身份，`passwd` 就是例子 | [Linux安全权限与审计](/kb/os/Linux/06-Linux安全权限与审计/) |
| sticky bit | `/tmp` 上只有文件属主可删自己的文件 | [Linux安全权限与审计](/kb/os/Linux/06-Linux安全权限与审计/) |
| capabilities | 把 root 权限拆成单个能力，`ping` 只需要 `cap_net_raw` | [Linux安全权限与审计](/kb/os/Linux/06-Linux安全权限与审计/) |

## 8. 本章小结

本目录六篇构成一条完整的"观察链"：**看进程 → 看内存 → 看磁盘 → 量 IO → 查网络与调用 → 管安全**。每一篇都遵循同一套路：先说教材概念怎么落到 Linux 上，再给"命令 + 输出 + 解读"三段式示例，最后用可复现实验让你亲手看到机制。学完本目录，你将能读懂 `ps`/`top`/`free`/`vmstat`/`iostat`/`strace` 的输出，并在真实机器上定位"CPU 满了 / 内存不够 / 磁盘慢 / 连接异常 / 权限被拒"五类经典问题。

配合教材姊妹篇：[进程模型](/kb/os/进程线程/01-进程概念与状态模型/)、[内存调优](/kb/os/内存/06-内存性能与系统调优/)、[文件系统](/kb/os/存储/04-文件系统实现/)、[IO子系统](/kb/os/IO/05-IO路径与性能优化/)、[问题排查](/kb/os/问题排查/05-并发与异常排查/)。

## 9. 动手实验

1. **环境自检**：执行"实验环境建议"小节的自检命令，确认 `/proc`、核心工具可用，输出 `uname -a` 并记录内核版本。
2. **第一印象**：依次执行 `ps -ef | head`、`top -b -n1 | head -15`、`free -h`、`vmstat 1 3`，把四段输出贴到笔记里，尝试自己解释每一列。
3. **工具全家桶体检**：安装 `htop`、`sysstat`、`strace`、`inotify-tools`，然后逐个运行 `htop`、`iostat -x 1 3`、`strace -c ls /tmp`、`ss -tulnp`，确认无报错。
4. **读教程跑命令**：从 [Linux进程与调度实操](/kb/os/Linux/01-Linux进程与调度实操/) 的"僵尸进程实验"开始，亲手制造并清除一个僵尸进程——这是第一个"亲眼看到教材概念"的里程碑。

## 10. 自测题

1. **为什么本目录实验不建议在 macOS 上跑？** macOS 缺少 `/proc` 文件系统，`ps`/`top`/`free` 等工具的选项与输出格式和 Linux 差异很大。
2. **`top` 里 `load average` 三个数分别代表什么？** 过去 1、5、15 分钟的平均负载（就绪 + 不可中断任务数），1 分钟 < 5 分钟通常说明负载在下降。
3. **`free -h` 中 `available` 与 `free` 的区别？** `available` 包含了可回收的 cache/buffer，更接近真实可用内存。
4. **`strace` 能帮你回答什么问题？** 进程正在执行哪些系统调用、在哪个文件上卡住、参数是什么，是"进程为什么慢/卡"的第一诊断工具。
5. **读 `ps -eo pid,stat,cmd` 时，STAT 为 `Z+` 的进程代表什么？** `Z` 是僵尸（已退出未被父进程回收），`+` 表示属于前台进程组。
