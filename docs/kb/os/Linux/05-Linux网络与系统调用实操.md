---
title: "Linux 网络与系统调用实操"
permalink: /kb/os/Linux/05-Linux网络与系统调用实操/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Linux IO 与性能监控实操", link: /kb/os/Linux/04-LinuxIO与性能监控实操/ }
next: { text: "Linux 安全权限与审计", link: /kb/os/Linux/06-Linux安全权限与审计/ }
knowledgeNote:
  series: "OS"
  group: "Linux"
---
::: abstract 本章定位
把教材中的进程机制、系统调用与并发概念落到网络与动态追踪上：用 `ss`/`lsof`/`netstat` 看 TCP 连接与状态机，解释 TIME_WAIT 为什么必须存在，用 `strace -p` 实时看进程在调用什么系统调用，用 `gdb` 附加进程看调用栈，用 `perf` 做 CPU 采样定位热点，最后用 `ulimit` 管理资源限制。概念原理对应 [并发与异常排查](/kb/os/问题排查/05-并发与异常排查/) 与 [系统调用](/kb/os/进程线程/02-进程控制块与系统调用/)。
:::

教材讲"系统调用是用户态进入内核态的唯一通道"、"进程有打开文件表"。这篇把它们变成诊断工具：**进程卡住了？`strace -p` 看它卡在哪个调用；连接打不开？`ss -tulnp` 看端口状态；热点在哪？`perf top` 采样五分钟。** 这些都是排查线上故障的"三件套"。

## 1. 看连接：ss / netstat / lsof

### 1.1 ss：现代 socket 统计

```bash
ss -tunlp
```
预期输出片段：
```
Netid State   Local Address:Port   Peer Address:Port   Process
tcp   LISTEN  0.0.0.0:22           0.0.0.0:*           users:(("sshd",pid=523,fd=3))
tcp   LISTEN  127.0.0.1:3306       0.0.0.0:*           users:(("mysqld",pid=1120,fd=7))
tcp   ESTAB   10.0.0.5:22          192.168.1.9:40001   users:(("sshd",pid=1501,fd=4))
udp   LISTEN  127.0.0.1:53        0.0.0.0:*            users:(("named",pid=990,fd=10))
```
解读：`-t` TCP、`-u` UDP、`-n` 不做域名解析、`-l` 只显示监听、`-p` 显示进程。第三行是个真实建立的 SSH 连接——`LISTEN` 是服务器在等连接，`ESTAB` 是连接已建立。`ss` 是 `netstat` 的现代替代（更快、信息更全）。

```bash
# 只看 TCP 状态统计：各状态各有多少连接
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c
```
预期输出片段：
```
  1 LISTEN
  2 ESTAB
  3 TIME-WAIT
```
```bash
# 查看与指定 IP/端口相关的连接
ss -tn dst 192.168.1.9:443
```

### 1.2 netstat：经典兼容

```bash
netstat -tunlp
```
预期输出片段：
```
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address  Foreign Address State   PID/Program name
tcp        0      0 0.0.0.0:22     0.0.0.0:*        LISTEN  523/sshd
```
解读：老命令但脚本兼容性好。`Recv-Q/Send-Q` 非 0 说明有数据堆积（接收队列满 = 应用读太慢，是排查背压的信号）。

### 1.3 lsof：谁占着端口/文件

```bash
sudo lsof -i :3306
```
预期输出片段：
```
COMMAND  PID  USER   FD   TYPE  DEVICE  SIZE/OFF  NODE  NAME
mysqld  1120  mysql  12u  IPv4  123456       0t0   TCP  *:mysql (LISTEN)
```
```bash
sudo lsof -p 1120 | head -5     # 这个进程打开了哪些文件/套接字
sudo lsof +D /data              # 谁在使用 /data 目录下的文件
```
解读：`lsof` 是"打开文件表"的实证工具——教材说进程有打开文件表，`lsof -p` 就是把那张表打印出来。端口冲突排查、目录 busy 排查都靠它。

## 2. traceroute / route：网络路径与路由

```bash
traceroute -n baidu.com
```
预期输出片段：
```
traceroute to baidu.com (39.156.66.10), 30 hops max
 1  192.168.1.1   0.5 ms
 2  10.0.0.1      2.1 ms
 3  61.148.3.5    8.3 ms
 4  * * *
 5  39.156.66.10  18.9 ms
```
解读：每一行是路径上的一个路由器，`*` 表示该跳不响应 ICMP（正常）。用于定位"网络慢在哪一跳"。

```bash
ip route          # 现代命令
route -n          # 经典命令
```
预期输出片段：
```
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100
```
解读：`default via` = 默认网关；直连网段走本机网卡。网络不通时先 `ip route` 确认路由，再 `traceroute` 定位断点。

## 3. TCP 状态机与 TIME_WAIT

`ss -tan` 里看到的 TCP 状态就是教材 TCP 状态机的实况。关键状态：

| 状态 | 含义 | 谁会出现 |
|---|---|---|
| `LISTEN` | 服务端监听端口，等连接 | 服务端（sshd、nginx、mysqld） |
| `SYN-SENT` / `SYN-RECV` | 三次握手途中 | 客户端/服务端，短暂 |
| `ESTAB` | 已建立连接 | 正常通信双方 |
| `FIN-WAIT-1/2` | 主动关闭方发出/收到 FIN 后 | 主动断连方 |
| `CLOSE-WAIT` | 被动关闭方收到 FIN、应用还没 close | **若大量堆积 = 应用没 close socket（泄漏）** |
| `LAST-ACK` | 被动方发 FIN 等最后 ACK | 短暂 |
| `TIME-WAIT` | 主动方发完最后 ACK 后等待 2MSL | 主动断连方，短暂但会堆积 |

```bash
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c
```
预期输出片段：
```
  40 TIME-WAIT
   2 ESTAB
   1 LISTEN
```

::: important TIME-WAIT 为什么必须存在
1. **保证最后一个 ACK 丢包时可重发**：主动方发出 FIN 的 ACK 若丢失，被动方会重发 FIN，TIME-WAIT 期间主动方还能回 ACK。
2. **防止旧连接报文串台**：等 2MSL（两倍最大报文段寿命，Linux 默认 60 秒），确保这条连接的旧报文在网络中彻底消失，不会干扰新建的同端口连接。
3. **大量 TIME-WAIT 正常吗？** 高并发短连接（如 HTTP 请求）必然产生，通常无需处理；只有端口/内存资源吃紧时才调 `net.ipv4.tcp_tw_reuse` 等参数（注意：内核 4.12 后 `tcp_tw_reuse` 默认就是安全开启的）。
:::

## 4. 系统调用追踪：strace / ltrace

### 4.1 strace -p：挂在运行中的进程上

```bash
# 先造一个"卡住"的进程
python3 -c 'import time; time.sleep(1000)' &
sudo strace -p $! -e trace=read,write,futex
```
预期输出片段：
```
[pid 2177] futex(0x7f4a80290c98, FUTEX_WAIT, 4, NULL) = -1 EAGAIN
[pid 2177] futex(0x7f4a80290c98, FUTEX_WAIT, 5, NULL) = 0
```
解读：看到进程反复在 `futex`（线程同步）上等待——它其实"在睡觉"。**进程卡住时 strace 是第一个诊断工具**：如果卡在 `read()` 说明在等 IO/网络，卡在 `futex` 可能是锁竞争，卡在 `select/poll` 说明等事件。

```bash
# 统计各系统调用次数与耗时
sudo strace -c -p $!
```
预期输出片段：
```
% time     seconds  usecs/call     calls    errors syscall
  -nan    0.000000          0     10000          0 futex
```
解读：`-c` 汇总计数，能看出一段时间内哪种调用最多、最耗时。

::: warning strace -p 的开销
strace 会大幅拖慢目标进程（每次系统调用都要经过 ptrace），**生产环境谨慎使用**，先用 `pidstat` 等低成本工具，必要时才挂 strace，用后立即 `Ctrl+C` 断开。
:::

### 4.2 ltrace：库函数调用

```bash
ltrace ls /tmp 2>&1 | head -10
```
预期输出片段：
```
__libc_start_main(0x...)
strlen("...") = 4
opendir("/tmp") = 0x...
readdir(0x...) = ...
```
解读：`strace` 看**系统调用**（内核接口），`ltrace` 看**动态库函数**（用户态接口，如 `malloc`、`opendir`、`strlen`）。排查"程序内部逻辑卡住"时，`ltrace` 比 `strace` 更接近业务层。

## 5. gdb：附加进程看调用栈

```bash
# 造一个活跃的进程
python3 -c 'import time; [time.sleep(0.01) for _ in range(1000000)]' &
sudo gdb -p $! --batch -ex "thread apply all bt"
```
预期输出片段：
```
Thread 1 (LWP 2178):
#0  __GI___clock_nanosleep (clock_id=0, flags=0, ...) at .../clock_nanosleep.c
#1  __GI___nanosleep (...)
#2  0x00007f... in ...
#3  PyEval_EvalFrameDefault ...
```
解读：`bt`（backtrace）打印调用栈，从当前栈帧一路追溯到入口——进程"在干嘛"看得一清二楚。配合 `gdb -p &lt;pid&gt;` 交互模式，还可以 `p` 打印变量、`continue` 继续运行。**这是排查死锁/死循环的终极手段**：`thread apply all bt` 看每个线程卡在哪。

```bash
# 交互模式常用
#   bt          查看当前线程调用栈
#   info threads 列出所有线程
#   thread 2    切换到线程 2
#   continue    继续运行
#   quit        退出（会先问是否 detach）
```

## 6. perf：CPU 采样分析

### 6.1 perf top：实时热点

```bash
sudo perf top
```
预期输出片段：
```
Samples: 1K of event 'cpu-clock', 4000 Hz, Event count (approx.): ...
Overhead  Shared Object      Symbol
  25.32%  [kernel]           [k] _raw_spin_unlock_irqrestore
  12.10%  mysqld             [.] MYSQLparse
   8.44%  libc-2.31.so       [.] _int_malloc
```
解读：`perf top` 每秒采样，按 CPU 开销排序显示**热点函数**。`[k]` 内核函数、`[.]` 用户态函数、`[kernel]` 段表示内核热点。**"CPU 都去哪了"的终极答案**——比 top 的 us/sy 粗粒度更进一步，直接定位到函数。

### 6.2 perf record / report：离线剖析

```bash
# 对运行中的 mysql 采样 10 秒
sudo perf record -g -p 1120 sleep 10
sudo perf report
```
预期输出片段：
```
Children      Self   Command  Shared Object      Symbol
  40.00%     2.00%  mysqld   libc-2.31.so       [.] _int_malloc
  38.00%    38.00%  mysqld   mysqld             [.] MYSQLparse
```
解读：`-g` 记录调用栈（火焰图数据源）、`-p` 指定进程、后跟时长。`perf report` 交互查看，按 `Enter` 展开调用链看 **"哪个函数调用了热点"**。这是线上 CPU 飙高时定位根因的标准流程：`perf record` → `perf report` → 顺调用链找业务代码。

```bash
# 生成火焰图数据（可后续交给 flamegraph 工具）
sudo perf record -g -o /tmp/perf.data sleep 30 &
# 结束后：perf script > /tmp/perf.script，再用 flamegraph 工具生成 SVG
```

::: tip 工具分工
日常看 `top`，细看 `pidstat`，定位函数用 `perf top`，深挖调用链用 `perf record/report`，进程卡死用 `strace`/`gdb`。这是一个从"粗"到"细"的排查阶梯。
:::

## 7. dmesg：内核日志

```bash
dmesg -T | tail -20
```
预期输出片段：
```
[Wed Aug  6 10:00:01 2025] device eth0 entered promiscuous mode
[Wed Aug  6 10:00:05 2025] TCP: request_sock_TCP: Possible SYN flooding...
[Wed Aug  6 10:00:05 2025] Out of memory: Killed process 2210 (python3)
```
解读：`dmesg` 显示**内核环形缓冲区**消息，`-T` 转成可读时间。OOM 记录、网卡事件、磁盘错误、SYN flooding 警告全在这。**任何"进程神秘消失 / 系统诡异"先看 dmesg。**

```bash
dmesg -T | grep -i -E 'oom|error|panic' | tail -10
# 过滤关键字快速定位严重事件
```

## 8. ulimit：资源限制

```bash
ulimit -a
```
预期输出片段：
```
core file size          (blocks, -c) 0
data seg size           (kbytes, -d) unlimited
scheduling priority             (-e) 0
file size               (blocks, -f) unlimited
pending signals                 (-i) 15152
max locked memory       (kbytes, -l) 16384
max memory size         (kbytes, -m) unlimited
open files                      (-n) 1024        ← 文件描述符上限！
stack size              (kbytes, -s) 8192         ← 栈大小
cpu time               (seconds, -t) unlimited
max user processes              (-u) 15152
virtual memory          (kbytes, -v) unlimited
```

| 参数 | 含义 | 经典问题 |
|---|---|---|
| `-n` open files | 单进程可打开的文件描述符数 | **`Too many open files`** 的根因 |
| `-s` stack size | 进程栈大小 | 递归过深栈溢出（默认 8MB） |
| `-u` max user processes | 单用户最大进程数 | 多进程服务启动失败 |
| `-c` core file size | 崩溃时 core dump 大小 | 0 表示不生成 core 文件 |

```bash
ulimit -n          # 当前值：1024
ulimit -n 65535    # 临时提高到 65535（当前 shell 生效）
# 永久修改：/etc/security/limits.conf
#   * soft nofile 65535
#   * hard nofile 65535
```
::: warning 高频面试/事故点
高并发服务收到 "Too many open files" = 文件描述符耗尽。查法：`ulimit -n` 看上限，`lsof -p &lt;pid&gt; | wc -l` 看进程当前打开数，`ss -s` 看连接总量。堆栈溢出则要调 `-s` 或减少递归深度。
:::

## 9. watch 与 /proc/net/tcp

```bash
watch -n1 'cat /proc/net/tcp | awk '\''NR>1 {print $4}'\'' | sort | uniq -c'
```
预期输出片段：
```
  0A: LISTEN
  1B: ESTABLISHED
  14: TIME_WAIT
```
解读：`/proc/net/tcp` 是内核维护的连接表（十六进制地址与状态），`watch` 每秒刷新。虽然 `ss` 更友好，但读懂 `/proc/net/tcp` 能理解 `ss` 的数据从哪来；`watch` 让任何"瞬时状态"变"时间序列"，适合观察连接回收过程。

```bash
# 连接状态编码速查（/proc/net/tcp 第 4 列）
# 01 ESTABLISHED  02 SYN_SENT  03 SYN_RECV  04 FIN_WAIT1
# 05 FIN_WAIT2   06 TIME_WAIT  07 CLOSE      08 CLOSE_WAIT
```

## 10. 本章小结

- 看连接用 `ss -tulnp`（现代）与 `netstat -tunlp`（兼容），`lsof -i`/`lsof -p` 看"谁占着端口/打开着什么"。
- TCP 状态机里 `CLOSE_WAIT` 堆积 = 应用泄漏（没 close），`TIME_WAIT` 堆积 = 高并发短连接（正常），TIME_WAIT 存在是为了 ACK 可靠与防串台。
- 进程诊断三步走：`strace -p` 看卡在哪个系统调用 → `gdb -p` 看调用栈/死锁 → `perf record/report` 定位 CPU 热点。
- `dmesg` 是内核的"黑匣子"，OOM、磁盘错误、网络攻击警告全在里面。
- `ulimit` 控制进程资源：`-n` 文件描述符、`-s` 栈大小、`-u` 进程数；"Too many open files" 是连接型服务的头号杀手。

## 11. 动手实验

1. **连接观察**：本地起 `python3 -m http.server 8000`，另开终端 `ss -tulnp` 看 LISTEN，再用浏览器/curl 访问后立刻 `ss -tn` 看 ESTAB 与 TIME-WAIT 出现。
2. **TIME_WAIT 制造**：用 `for i in $(seq 1 50); do curl -s http://127.0.0.1:8000 > /dev/null; done`，随后 `ss -tan | awk 'NR>1{print $1}' | sort | uniq -c`，观察 TIME-WAIT 数量。
3. **strace 探活**：启动 `sleep 300`，`strace -p &lt;pid&gt; -e trace=nanosleep` 观察它不停在 `nanosleep` 上睡觉；`Ctrl+C` 断开。
4. **gdb 看栈**：对 5 节的 python 进程跑 `sudo gdb -p &lt;pid&gt; --batch -ex "thread apply all bt"`，找出它目前停在哪个函数。
5. **perf 采样**：`sudo perf record -g -a sleep 5` 后 `sudo perf report`，找到前 3 个热点函数，判断是内核还是用户态。

## 12. 自测题

1. **`CLOSE_WAIT` 大量堆积说明什么？** 被动关闭方收到了对方的 FIN，但应用层一直没调用 `close()`——通常是代码里 socket 泄漏，连接只开不关。
2. **TIME_WAIT 存在的两个理由？** ① 主动方最后的 ACK 可能丢失，需要保留状态以便重发；② 等待 2MSL 确保旧报文在网络中消亡，防止与新建连接串台。
3. **`strace -p` 与 `gdb -p` 的区别？** strace 追踪系统调用（内核接口层面的行为），gdb 能打断点/看内存/打印调用栈（程序内部状态）；先 strace 定位阻塞点，再 gdb 深入。
4. **"Too many open files" 如何快速排查？** `ulimit -n` 看单进程上限，`sudo lsof -p &lt;pid&gt; | wc -l` 看当前打开数，`ss -s` 看系统连接总量；修复方向是提高 `ulimit -n` 或修复代码里的连接/文件泄漏。
5. **perf record 采样结果里 `[k]` 和 `[.]` 代表什么？** `[k]` 是内核态符号（系统调用/驱动/调度），`[.]` 是用户态符号（业务代码/动态库），据此判断热点在用户程序还是内核。
