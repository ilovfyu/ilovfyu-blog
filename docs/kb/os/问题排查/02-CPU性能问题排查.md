---
title: "CPU 性能问题排查"
permalink: /kb/os/问题排查/02-CPU性能问题排查/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "性能分析方法论", link: /kb/os/问题排查/01-性能分析方法论/ }
next: { text: "内存与内存泄漏排查", link: /kb/os/问题排查/03-内存与内存泄漏排查/ }
knowledgeNote:
  series: "OS"
  group: "问题排查"
---
::: abstract 本章定位
本篇把 [篇](/kb/os/问题排查/01-性能分析方法论/) 的 CPU 方向做深：从"CPU 过高"（us/sy 分别怎么查）到"CPU 不高但机器慢"（等 IO / 等锁），从"上下文切换过高"到"软中断过高"，再到 CPU 绑定与隔离、死循环程序、系统调用密集等核弹级案例。对应《Operating System Concepts》Ch3-5（进程、线程、调度）与中断机制在 Linux 上的真实表现。
:::

CPU 问题按现象分五类，本篇逐一拆解，每个现象给"现象 → 工具 → 定位 → 修复"的完整链路：

```mermaid
flowchart TD
    A[CPU 问题] --> B[CPU 过高 us 高]
    A --> C[CPU 过高 sy 高]
    A --> D[CPU 不高但机器慢]
    A --> E[上下文切换过高]
    A --> F[软中断/硬中断过高]
    B --> B1[perf top 找热点函数]
    C --> C1[strace 找系统调用]
    D --> D1[等 IO wa / 等锁 wchan]
    E --> E1[pidstat -w 找凶手]
    F --> F1[/proc/softirqs 分中断类型]
```

## 1. CPU 过高：us 高（用户态计算密集）

### 1.1 现象确认

```bash
$ top -b -n1 | head -8
top - 21:48:33 up 46 days,  3:12,  1 user,  load average: 8.02, 7.87, 7.61
%Cpu(s): 89.0 us,  6.0 sy,  0.0 ni,  4.0 id,  0.5 wa,  0.0 hi,  0.5 si,  0.0 st

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
 3841 app       20   0 2787288 1.1g  12440 R 302.4  7.0 123:21.67 node
 2035 mysql     20   0 1635240 480m  31308 S   8.3  3.0   45:11.02 mysqld
```

解读：`us=89`、`wa≈0` → 应用在真实计算。PID 3841 占 302% CPU（3 个核）。TIME+ 123 分钟说明不是瞬时尖峰，是持续高占用。

### 1.2 定位进程与线程

```bash
# 按 CPU 排序找嫌疑进程
ps -eo pid,ppid,pcpu,stat,comm --sort=-pcpu | head -10

# 进到线程级：top 里按 H，或 pidstat -t
pidstat -t -u 1 3 -p 3841
```

预期输出：

```
$ pidstat -t -u 1 3 -p 3841
21:50:00      UID      TGID       TID    %usr %system  %guest   %wait    %CPU  Command
21:50:01     1000     3841         -    99.80    0.00      0.0      0.0   99.80  node
21:50:01     1000        -      3842    99.80    0.00      0.0      0.0   99.80  |__worker
```

解读：锁定到具体线程 3842（`|__worker`）。`%usr=99.8、%system=0` → 纯用户态，无系统调用干扰，热点在应用代码。

### 1.3 perf top 采样热点函数

```bash
sudo perf top -p 3841
Samples: 1M of event 'cycles', 4000 Hz, Event count (approx.): 2858721200
  Children      Self  Shared Object       Symbol
+  55.02%     0.00%  node               [.] v8::internal::String::Flatten
+  34.10%     0.00%  node               [.] v8::internal::Parser::ParseStatements
```

解读：热点集中在 `String::Flatten`（字符串拼接）+ 解析器。这是采样，几秒钟就能看出热点在哪个函数。要拿完整调用链，用火焰图（[篇 §火焰图](/kb/os/问题排查/01-性能分析方法论/)）。

```bash
sudo perf record -F 99 -g -p 3841 -- sleep 30
sudo perf report --stdio | head -30
```

### 1.4 修复方向

| 热点类型 | 典型代码问题 | 优化手段 |
|---|---|---|
| 字符串拼接 | 循环里 `s += x` | 改用 `StringBuilder`/`join()`，预分配容量 |
| 正则/解析 | 高流量下逐条解析 | 预编译正则、流式解析、缓存结果 |
| 哈希/排序 | 大集合反复排序 | 用索引/缓存、避免 O(n²) 算法 |
| 序列化 | JSON/Proto 反复编解码 | 二进制协议、批量传输 |

::: warning 别一上来就 `renice`/`taskset`
高 us 的根因是**算法/代码**，调优先级只是让出 CPU 给别的进程，治标不治本。先把热点函数找到再动手。
:::

## 2. CPU 过高：sy 高（内核态/系统调用密集）

### 2.1 现象：us 不高、sy 很高

```
%Cpu(s): 8.0 us, 55.0 sy,  0.0 ni, 30.0 id,  3.0 wa,  0.0 hi,  3.0 si,  0.0 st
```

解读：`sy=55` 远超 `us=8` → 大量时间花在内核态。常见三类原因：

1. **系统调用过密**：高频 read/write、clone、gettimeofday（见 2.3）。
2. **锁竞争/自旋**：内核在自旋锁上打转（配合 `cs` 高）。
3. **中断处理**：软中断/硬中断吃 CPU（见第 5 节）。

### 2.2 确认是哪个进程在产生 sy

```bash
$ pidstat -u 1 3
21:50:00      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
21:50:01     1000      2345     2.00   48.00      0.0      0.0   50.00     2  nginx
21:50:02     1000      2345     1.00   49.00      0.0      0.0   50.00     2  nginx
```

解读：nginx 几乎全是 `%system`。接着用 strace 统计它在调哪些系统调用：

### 2.3 strace 统计系统调用（附身前需确认权限）

```bash
$ sudo strace -c -p 2345 -- timeout 5
strace: Process 2345 attached
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 90.05    2.310000     48000        48           sendto
  6.00    0.154000       16000         9           recvfrom
  3.50    0.089999        1112        80         poll
------ ----------- ----------- --------- --------- ----------------
100.00    2.563972                   137           total
```

解读：`sendto` 占 90% 且单次调用 48ms——nginx 在**高频发 UDP 包且都在等待/重试**。对应 [篇](/kb/os/问题排查/01-性能分析方法论/) 的 NFS 案例。如果看到大量 `futex` 调用，说明是锁等待（[篇](/kb/os/问题排查/05-并发与异常排查/)）；大量 `read/write` 则是 IO 路径问题（[篇](/kb/os/问题排查/04-磁盘与IO瓶颈排查/)）。

::: important strace 的坑
`strace -c -p` 是**计数不阻塞**，性能开销小；但 `strace -e trace=xxx -p` 会逐次截停系统调用，会让进程慢 10–100 倍，生产环境慎用、用完立刻摘除。更轻量的是 `perf trace` 或 `bpftrace`。
:::

## 3. CPU 不高但机器慢：等 IO 或等锁

### 3.1 现象：id 高、load 高

```
$ uptime
 21:48:33 up 46 days,  3:12,  1 user,  load average: 7.02, 6.87, 5.61
$ top -b -n1 | head -4
%Cpu(s):  3.0 us,  2.0 sy,  0.0 ni, 58.0 id, 35.0 wa,  0.0 hi,  1.0 si,  0.0 st
```

解读：load 7.0 很高，但 `id=58`（大量空闲）、`wa=35`。**CPU 空着，进程在等磁盘**。这是 load 的经典陷阱——load 把 D 状态任务算进去了。

### 3.2 区分"等 IO"和"等锁"

```bash
# 找 D 状态（等 IO）和 S 状态但阻塞的进程
ps -eo pid,stat,wchan:24,comm | grep -E ' D| S' | head
```

预期输出：

```
  PID STAT WCHAN                COMMAND
 3841 D    io_schedule          mysqld
 2035 D    wait_on_page_bit     java
 1421 S    futex_wait_queue_me  app
```

解读：
- **D 状态 + wchan 是 `io_schedule`/`wait_on_page_bit`** → 等磁盘/内存页（[磁盘篇](/kb/os/问题排查/04-磁盘与IO瓶颈排查/)）。
- **S 状态 + wchan 是 `futex_wait_queue_me`** → 等用户态锁（[并发篇](/kb/os/问题排查/05-并发与异常排查/)）。

::: tip wchan 是什么
`wchan`（wait channel）是进程阻塞在内核里的**函数名**，`ps -o wchan` 或 `cat /proc/PID/wchan` 查看。它是"进程此刻在哪等"的最快答案，非 root 可能显示为 `&lt;blank&gt;`。
:::

### 3.3 确认等待对象

- 等 IO：看 `iostat -x 1` 的 `%util` 和 `await`（详见 [磁盘篇 §iostat](/kb/os/问题排查/04-磁盘与IO瓶颈排查/)）。
- 等锁：`gdb -p PID` 附加后 `bt`（C/C++）或 `jstack`（Java），看线程卡在哪个锁（详见 [并发篇](/kb/os/问题排查/05-并发与异常排查/)）。

## 4. 上下文切换过高

### 4.1 现象：cs 飙高

```bash
$ vmstat 1 3
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  0      0 152344  40228 902364    0    0     6    40 1031 5800  4  3 93  0  0
 1  0      0 152344  40228 902364    0    0     6    40 1020 5900  4  3 93  0  0
```

解读：`cs`（context switches/s）约 5900，对 8 核机器偏高（正常每核 100–1000）。上下文切换本身消耗 CPU（`sy` 也会涨），还可能伴随 TLB/cache 冲刷。

### 4.2 判断是"哪个进程"在疯狂切换

```bash
$ pidstat -w 1 3
21:50:00      UID       PID   cswch/s nvcswch/s  Command
21:50:01     1000      2345     11.00      0.00   nginx
21:50:01     1000      5121   3200.00    0.00     java
21:50:02     1000      5121   3250.00    0.00     java
```

解读：`cswch/s`（voluntary，主动让出）高达 3200——java 进程在**大量主动让出 CPU**。常见原因：

| 场景 | 特征 | 方向 |
|---|---|---|
| 线程疯狂 sleep/超时重试 | cswch 高、CPU 不高 | 查代码里的 `Thread.sleep` 循环 / 空转轮询 |
| 锁竞争：抢不到就睡 | cswch 高 + wchan=futex | [并发篇](/kb/os/问题排查/05-并发与异常排查/) |
| IO 太慢，每次等完回来又被切走 | cswch 高 + wa 高 | [磁盘篇](/kb/os/问题排查/04-磁盘与IO瓶颈排查/) |
| 大量线程互相唤醒 | nvcswch（非自愿）高 | 检查线程数是否失控 |

```bash
# 非自愿切换（被内核抢占）高 = 调度器强制换人
cat /proc/5121/status | grep -i 'ctxt_switches'
voluntary_ctxt_switches:	1254823
nonvoluntary_ctxt_switches:	21234
```

::: tip 自愿 vs 非自愿
- **voluntary**：进程主动让出（sleep、等 IO、等锁）→ 问题多半在"等待"。
- **nonvoluntary**：时间片耗尽被抢占 → 说明该线程本身吃 CPU，回到第 1 节找热点。
计数在 `/proc/PID/status` 里，随运行累计，两次采样差值才是速率。
:::

### 4.3 与"大量线程"的关系

线程太多 + 都在抢 CPU/锁 → 切换风暴。检查线程数：

```bash
cat /proc/5121/status | grep Threads        # 该进程线程数
cat /proc/sys/kernel/threads-max            # 系统线程上限
ps -eLf | wc -l                             # 系统总线程数
```
线程失控的处理见 [并发篇 §大量线程](/kb/os/问题排查/05-并发与异常排查/)。

## 5. 软中断/硬中断过高

### 5.1 现象：si 高

```
%Cpu(s): 4.0 us, 3.0 sy,  0.0 ni, 40.0 id,  0.0 wa,  0.0 hi, 50.0 si,  0.0 st
```

解读：`si`（soft irq）占 50%——CPU 大量时间在跑软中断，最常见的元凶是**网络收发包**。

### 5.2 看中断分布

```bash
$ cat /proc/softirqs
                    CPU0       CPU1       CPU2       CPU3
          HI:          0          0          0          0
       TIMER:   12345678   12345678   12345678   12345678
      NET_TX:    1234567    1234567    1234567    1234567
      NET_RX:  998765432  887654321  776543210  665432109
       BLOCK:      12345      12345      12345      12345
     SCHED:   98765432   98765432   98765432   98765432
   TASKLET:          0          0          0          0
```

解读：`NET_RX`（网络接收软中断）计数远超其他且不断增长 → **网络收包是软中断大户**。对照确认网卡中断：

```bash
$ cat /proc/interrupts | grep -i eth0
     CPU0     CPU1     CPU2     CPU3
 176: 1234567  0        0        0        eth0-0
 177: 0        2345678  0        0        eth0-1
```

### 5.3 定位流量来源

```bash
# 网卡吞吐
sar -n DEV 1 3 | tail -5
# 连接数分布
ss -s
# 哪个进程在收包
sudo nethogs eth0
```

修复方向：
- **多队列网卡 + RPS**（Receive Packet Steering）：把中断/收包分散到多核：`echo f > /sys/class/net/eth0/queues/rx-0/rps_cpus`。
- 检查是否被 DDoS/突发流量打满（`tcpdump`/`nethogs` 确认来源）。
- 内核参数：`net.core.netdev_budget`、`net.core.netdev_max_backlog`。

::: warning 硬中断（hi）高
`hi` 高一般是驱动/硬件问题：网卡 IRQ 在单核堆积（看 `/proc/interrupts` 是否全挤在 CPU0），用 IRQ affinity 均衡：`echo 2 > /proc/irq/176/smp_affinity`，或开启网卡多队列。
:::

## 6. CPU 绑定与隔离

### 6.1 taskset：把进程绑到指定核

多核场景下，进程在不同核间迁移会导致 cache 失效、TLB 冲刷。用亲和性把进程钉在固定核上：

```bash
# 查看进程当前的 CPU 亲和性（affinity）
taskset -pc 3841

# 运行新进程时绑定到核 0,1
taskset -c 0,1 ./heavy_task

# 把已运行进程绑定到核 2
sudo taskset -pc 2 3841
```

预期输出：

```
$ taskset -pc 3841
pid 3841's current affinity list: 0-7
$ sudo taskset -pc 2 3841
pid 3841's current affinity list: 2
```

解读：affinity 从 `0-7`（任意核）改为固定 `2`。适合**对 cache 敏感**或**实时性要求高**的任务。

::: tip numactl 进阶
NUMA 机器用 `numactl --cpunodebind=0 --membind=0 ./prog` 同时绑定 CPU 节点与内存节点，避免跨节点访问（[内存篇](/kb/os/内存/06-内存性能与系统调优/) 有更完整的 NUMA 讨论）。
:::

### 6.2 内核级隔离：isolcpus / cpuset

把某些核从调度器中隔离出去，专门跑关键任务：

```bash
# 启动参数（/etc/default/grub 的 GRUB_CMDLINE_LINUX 里加）
GRUB_CMDLINE_LINUX="... isolcpus=6,7 nohz_full=6,7 rcu_nocbs=6,7"

sudo update-grub && sudo reboot
```

解读：`isolcpus=6,7` 让核 6/7 不再被普通进程使用，只接受显式绑定的任务（配合 `taskset -c 6,7`）。`nohz_full` 关闭该核的周期时钟中断，进一步降低抖动。这是**低延迟高负载**场景（如数据库、高频交易）的常见配置。

::: warning 隔离的代价
隔离会浪费核（普通任务用不上），且对 OS 理解要求高。中小业务不要轻易用，优先 `taskset` 绑定即可。
:::

## 7. 核弹案例

### 7.1 案例 A：死循环程序

::: note 场景
开发说"我部署了个脚本，机器卡死了"。`top` 显示某进程 100%，load 飙到 12。
:::

**定位过程**：

```bash
$ top -b -n1 | head -8
  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
  999 root      20   0   11088   1384    932 R 100.0  0.0   8:32.11 loop
```

```bash
$ sudo perf top -p 999
Samples: 80K of event 'cycles', 4000 Hz
  Children      Self  Shared Object      Symbol
+  99.80%    99.80%  loop               [.] 0x4005d1 (loop.bin)
```

**决策**：确认是无意义死循环（采样全部集中在一个函数）→ 停掉并问责：

```bash
$ kill -9 999 && uptime
 21:55:00 up 46 days,  3:12,  1 user,  load average: 12.02, 9.87, 6.61
```

解读：`kill -9` 后 load 的 1 分钟值还高（是 15 分钟加权平均，回落慢），但 r 队列、CPU 恢复。事后要求开发：死循环场景要加超时/上限保护，并上线监控。

### 7.2 案例 B：sy 高——系统调用风暴

::: note 场景
某 Go 服务 CPU 打满，`us` 不高、`sy` 接近 60%。
:::

**定位**：

```bash
$ pidstat -u 1 3 -p 5531
      UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
     1000      5531    12.00   48.00      0.0      0.0   60.00     0  app
```

```bash
$ sudo strace -c -p 5531 -- timeout 5
% time     seconds  usecs/call    calls     errors syscall
------ ----------- ----------- --------- --------- ----------------
 78.00    0.900000          -    200000           gettimeofday
 12.00    0.140000          -     50000           clock_gettime
  5.00    0.060000          -      8000           read
```

解读：每秒 4 万个 `gettimeofday`！典型场景是**框架在每次请求都取时间戳做日志/限流**，且没有做缓存。修复：日志时间戳批量打点、用单调时钟、减少无谓的时间调用。这就是"**高频系统调用把 sy 打满**"的教科书案例。

### 7.3 案例 C：软中断打满（见第 5 节，NET_RX 风暴）

小结：CPU 问题的三种形态——`us` 高找代码、`sy` 高找系统调用/中断、`cs` 高找锁与线程，三条线最终都收敛到"热点函数/热点调用"。

## 8. 实操练习题

::: note 练习 1（自己动手）
造一个 CPU 炸弹并定位它：
:::

```bash
# 终端 A：制造死循环（Python）
python3 -c 'while True: pass' &
# 终端 B：按要求回答
top -b -n1 | head -8          # 1. 找进程 PID 与 %CPU
ps -o pid,pcpu,comm -p $PID   # 2. 确认单进程 100%
sudo perf top -p $PID         # 3. 热点函数是什么？
kill $PID                     # 4. 杀掉后 load 如何变化？
```

::: note 练习 2
观察上下文切换与线程风暴：
:::

```bash
# 一个会开一堆线程空转的程序（可用 redis-benchmark 或自写）
pidstat -w 1 | head -20                       # 谁在疯狂切换
cat /proc/&lt;PID&gt;/status | grep Threads          # 线程数
ps -eLf | grep -c &lt;comm&gt;                       # 该进程线程总数
```

::: note 练习 3
观察软中断（需要能产生网络流量的环境）：
:::

```bash
# 一边持续下载/压测，一边看
cat /proc/softirqs | grep NET_RX              # 采样两次做差值
sar -n DEV 1 3                                # 同时看吞吐
vmstat 1 3 | tail -3                          # si 列
```

## 9. 本章小结

| 现象 | 关键指标 | 第一步命令 | 方向 |
|---|---|---|---|
| 计算密集 | us 高 | `perf top` | 优化代码/算法 |
| 系统调用密集 | sy 高 | `strace -c` | 合并调用、减时间戳 |
| 等 IO | wa 高、D 状态 | `ps -eo wchan` | [磁盘篇](/kb/os/问题排查/04-磁盘与IO瓶颈排查/) |
| 等锁 | cs 高、wchan=futex | `pidstat -w`、`jstack` | [并发篇](/kb/os/问题排查/05-并发与异常排查/) |
| 软中断 | si 高、NET_RX 大 | `/proc/softirqs` | 多队列/RPS、查流量 |
| 多核不均衡 | 单核打满其他空闲 | `mpstat -P ALL` | `taskset` 绑定、均衡负载 |

**主线**：先 `top` 分 us/sy/wa → `pidstat` 落到进程/线程 → `perf`/`strace` 钉到函数/系统调用 → 按表对症处理。CPU 排查看似花样多，本质只有"**谁在算**"和"**在算什么**"两件事。

## 10. 自测题

1. **`us` 高和 `sy` 高各代表什么？排查工具分别是什么？** us 高=用户态计算，用 `perf top` 找热点函数；sy 高=内核态开销，用 `strace -c` 统计系统调用。
2. **为什么 `sy` 会高？列举三种原因。** ①高频系统调用（如 gettimeofday）；②内核锁竞争/自旋；③中断/软中断处理。
3. **`vmstat` 的 `cs` 列如何解读？如何找出是哪个进程造成的？** cs=每秒上下文切换次数，全局偏高用 `pidstat -w` 定位到进程，再结合 `/proc/PID/status` 看 voluntary/nonvoluntary 区分等锁还是吃 CPU。
4. **`taskset -pc 2 PID` 做了什么？什么时候值得用？** 把进程固定到核 2，cache 敏感或低延迟场景用，避免核间迁移造成的 cache/TLB 失效。
5. **D 状态进程 + `wait_on_page_bit` 说明什么？与 futex 等待的区别？** D 状态等的是内核不可中断的资源（磁盘页），`wait_on_page_bit`=等页 IO；futex 是用户态锁等待（S 状态），处理方向一个是 [磁盘](/kb/os/问题排查/04-磁盘与IO瓶颈排查/)，一个是 [并发](/kb/os/问题排查/05-并发与异常排查/)。
