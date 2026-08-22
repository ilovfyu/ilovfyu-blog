export type KnowledgeArticle = {
  title: string
  date: string
  path: string
  summary: string
  tags: string[]
  topics: string[]
  series: string
  group: string
}

export const knowledgeArticles = [
  {
    "title": "操作系统学习路线总览",
    "date": "2026.08",
    "path": "/kb/os/总览/00-操作系统学习路线总览/",
    "summary": "操作系统是连接硬件与应用的唯一桥梁：它把 CPU、内存、磁盘、网卡封装成\"进程、地址空间、文件、套接字\"这四类抽象。本系列的每一篇都在回答一个具体问题：操作系统用什么机制实现抽象，…",
    "tags": [
      "OS"
    ],
    "topics": [],
    "series": "OS",
    "group": "OS"
  },
  {
    "title": "安全与保护学习路线",
    "date": "2026.08",
    "path": "/kb/os/安全/00-安全与保护学习路线/",
    "summary": "保护（Protection）与安全（Security）是一枚硬币的两面：保护是操作系统对内部\"合法用户\"之间的访问控制（谁可以用这个文件），安全是对外部\"恶意主体\"的攻防对抗（入侵…",
    "tags": [
      "OS",
      "安全"
    ],
    "topics": [],
    "series": "OS",
    "group": "安全"
  },
  {
    "title": "存储与文件系统学习路线",
    "date": "2026.08",
    "path": "/kb/os/存储/00-存储与文件系统学习路线/",
    "summary": "内存是\"易失的\"（断电即失），磁盘/SSD 是\"持久的\"（断电仍在）。操作系统要处理两者的速度差（内存纳秒级、磁盘毫秒级）和语义差（内存按字节、磁盘按块），于是有了存储抽象的三层答…",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "进程线程学习路线",
    "date": "2026.08",
    "path": "/kb/os/进程线程/00-进程线程学习路线/",
    "summary": "进程与线程是理解操作系统的第一块地基：进程是资源分配单位，线程是 CPU 调度单位。搞不懂这两者的区别、状态怎么转换、调度算法怎么算等待时间，后面读内存、同步、死锁、文件系统都会处…",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "内存管理学习路线",
    "date": "2026.08",
    "path": "/kb/os/内存/00-内存管理学习路线/",
    "summary": "内存是\"速度与容量的中间层\"：寄存器 < 缓存 < 主存 < 磁盘。CPU 每访问一次数据都要经过主存，主存的访问速度直接决定系统性能，而主存容量决定系统能同时装下多少进程。本系列…",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "死锁学习路线",
    "date": "2026.08",
    "path": "/kb/os/死锁/00-死锁学习路线/",
    "summary": "死锁的本质是一个循环等待：一组进程中的每个进程都在等一个只有该组内其他进程才能释放的资源，于是谁也无法前进。理解死锁的关键不是背定义，而是掌握一条主线：从\"为什么会发生\"到\"能不能…",
    "tags": [
      "OS",
      "死锁"
    ],
    "topics": [],
    "series": "OS",
    "group": "死锁"
  },
  {
    "title": "同步与异步学习路线",
    "date": "2026.08",
    "path": "/kb/os/同步异步/00-同步与异步学习路线/",
    "summary": "并发是操作系统里\"最容易出错、最考验功力\"的主题。两个线程 i++ 都可能把 100000 变成 99999；死锁了系统直接卡死。本目录要建立的能力是：",
    "tags": [
      "OS",
      "同步异步"
    ],
    "topics": [],
    "series": "OS",
    "group": "同步异步"
  },
  {
    "title": "系统问题排查方法论",
    "date": "2026.08",
    "path": "/kb/os/问题排查/00-系统问题排查方法论/",
    "summary": "排查故障最怕的不是没有工具，而是没有套路。新手拿到一台慢机器会随机敲命令，老手则按\"负载 → 进程 → 资源 → 日志 → 调用栈\"的固定顺序层层收敛。本篇先把套路和工具地图建立起…",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "Bash 命令学习路线总览",
    "date": "2026.08",
    "path": "/kb/os/Bash/00-Bash命令学习路线总览/",
    "summary": "\"看内核机制\"靠 ../Linux/00 Linux实操学习路线|Linux 实操，\"诊断线上问题\"靠 ../问题排查/00 系统问题排查方法论|问题排查，而这两者手里的\"刀\"就是…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU学习路线总览",
    "date": "2026.08",
    "path": "/kb/os/GPU/00-GPU学习路线总览/",
    "summary": "GPU 不是\"带很多核心的 CPU\"，而是面向吞吐量的专用并行协处理器。它有自己的内存、自己的调度器、自己的编程模型，甚至自己的\"操作系统\"——驱动 + 运行时 + 库的整条软件栈…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "IO 子系统学习路线",
    "date": "2026.08",
    "path": "/kb/os/IO/00-IO子系统学习路线/",
    "summary": "IO 的主题只有一个：用最少的 CPU 参与，完成最多的数据搬运。CPU 很贵、设备很慢，二者速度差了几个数量级，于是有了中断（别等轮询）、有了 DMA（别让 CPU 搬数据）、有…",
    "tags": [
      "OS",
      "IO"
    ],
    "topics": [],
    "series": "OS",
    "group": "IO"
  },
  {
    "title": "Linux 实操学习路线",
    "date": "2026.08",
    "path": "/kb/os/Linux/00-Linux实操学习路线/",
    "summary": "教材告诉你\"进程有就绪/运行/等待状态\"，ps 的 STAT 列让你看见这些状态；教材告诉你\"缓存加速 IO\"，free 的 buff/cache 列让你量到缓存；教材告诉你\"系统…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "保护机制与访问控制",
    "date": "2026.08",
    "path": "/kb/os/安全/01-保护机制与访问控制/",
    "summary": "很多人把\"保护\"和\"安全\"混为一谈。记住一句区分的话：保护关心\"合法的用户之间谁不能碰谁的东西\"，安全关心\"恶意的攻击者怎么进来\"。 保护是操作系统对内部资源的\"交通规则\"，安全是…",
    "tags": [
      "OS",
      "安全"
    ],
    "topics": [],
    "series": "OS",
    "group": "安全"
  },
  {
    "title": "磁盘结构与大容量存储",
    "date": "2026.08",
    "path": "/kb/os/存储/01-磁盘结构与大容量存储/",
    "summary": "所有高级抽象（文件系统、RAID、调度器）最终都作用在物理块上。不了解\"磁头要移动、盘片要旋转\"，就理解不了为什么随机 IO 比顺序 IO 慢几个数量级，也就理解不了磁盘调度算法存…",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "进程概念与状态模型",
    "date": "2026.08",
    "path": "/kb/os/进程线程/01-进程概念与状态模型/",
    "summary": "| 维度 | 程序 | 进程 |",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "内存管理基础与连续分配",
    "date": "2026.08",
    "path": "/kb/os/内存/01-内存管理基础与连续分配/",
    "summary": "学完本章，你会理解为什么\"连续分配\"不是终点——它为下一章的分页埋下两个伏笔：外部碎片无法根治、且每次换入换出要整块搬移。",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "死锁特征与必要条件",
    "date": "2026.08",
    "path": "/kb/os/死锁/01-死锁特征与必要条件/",
    "summary": "一组进程中的每个进程都在等待一个事件，而该事件只能由该组进程中的另一个进程触发。在资源语境下，这个事件就是\"其他进程释放资源\"。因为大家都在等，事件永远不可能发生，所有进程永久阻塞…",
    "tags": [
      "OS",
      "死锁"
    ],
    "topics": [],
    "series": "OS",
    "group": "死锁"
  },
  {
    "title": "临界区问题与互斥实现",
    "date": "2026.08",
    "path": "/kb/os/同步异步/01-临界区问题与互斥实现/",
    "summary": "counter++ 在汇编层面是三条指令（read-modify-write）：",
    "tags": [
      "OS",
      "同步异步"
    ],
    "topics": [],
    "series": "OS",
    "group": "同步异步"
  },
  {
    "title": "性能分析方法论",
    "date": "2026.08",
    "path": "/kb/os/问题排查/01-性能分析方法论/",
    "summary": "性能问题的本质是资源竞争：多个进程抢 CPU、抢内存、抢磁盘、抢锁。分析的目标就是回答三个问题——谁在抢？抢哪个资源？为什么抢？ 本篇教一套可以复制的方法，下一篇 02 CPU性能…",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "核心命令与文件操作",
    "date": "2026.08",
    "path": "/kb/os/Bash/01-核心命令与文件操作/",
    "summary": "- print working directory，打印当前所在目录的绝对路径。",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU硬件架构与工作原理",
    "date": "2026.08",
    "path": "/kb/os/GPU/01-GPU硬件架构与工作原理/",
    "summary": "CPU 的设计目标是让单条指令尽量快——为此不惜堆分支预测器、乱序执行、多级缓存，把一条访存指令的延迟压到 100ns 以内。GPU 的处境完全不同：它的假设是\"同时有成千上万个线…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "IO 硬件与设备控制",
    "date": "2026.08",
    "path": "/kb/os/IO/01-IO硬件与设备控制/",
    "summary": "- 以固定大小的块（典型 512B / 4096B）为单位读写，支持随机访问。",
    "tags": [
      "OS",
      "IO"
    ],
    "topics": [],
    "series": "OS",
    "group": "IO"
  },
  {
    "title": "Linux 进程与调度实操",
    "date": "2026.08",
    "path": "/kb/os/Linux/01-Linux进程与调度实操/",
    "summary": "教材里的 5 状态状态机（new/ready/running/waiting/terminated）在 Linux 里就是 ps 输出中的 STAT 列。这一篇的全部目标：你看到任…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "身份认证与密码学基础",
    "date": "2026.08",
    "path": "/kb/os/安全/02-身份认证与密码学基础/",
    "summary": "安全的第一道防线是\"确认你是谁\"（Authentication），第二道才是\"你进来后能干什么\"（Authorization，见 01 保护机制与访问控制）。而密码学是让认证与加密…",
    "tags": [
      "OS",
      "安全"
    ],
    "topics": [],
    "series": "OS",
    "group": "安全"
  },
  {
    "title": "磁盘调度算法与RAID",
    "date": "2026.08",
    "path": "/kb/os/存储/02-磁盘调度算法与RAID/",
    "summary": "磁盘一次随机访问约 8–10 ms，其中寻道 + 旋转占 99%+（见 01 磁盘结构与大容量存储）。当多个请求在队列中等候时，服务顺序直接决定总寻道距离。调度的目标：",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "进程控制块与系统调用",
    "date": "2026.08",
    "path": "/kb/os/进程线程/02-进程控制块与系统调用/",
    "summary": "每个进程在内核中都有一份 Process Control Block（进程控制块），也叫进程描述符（Linux 中叫 taskstruct）。PCB 是内核\"管理这个进程\"的全部依…",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "分页与页表结构",
    "date": "2026.08",
    "path": "/kb/os/内存/02-分页与页表结构/",
    "summary": "本章是全部内存系列的地基，03 分段与段页式、04 虚拟内存与按需分页 都建立在页表机制之上。",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "资源分配图与死锁建模",
    "date": "2026.08",
    "path": "/kb/os/死锁/02-资源分配图与死锁建模/",
    "summary": "一张 RAG 由两类节点和两类有向边组成。",
    "tags": [
      "OS",
      "死锁"
    ],
    "topics": [],
    "series": "OS",
    "group": "死锁"
  },
  {
    "title": "信号量与同步原语",
    "date": "2026.08",
    "path": "/kb/os/同步异步/02-信号量与同步原语/",
    "summary": "信号量 S 是一个整数变量（非负），加上两个原子操作：",
    "tags": [
      "OS",
      "同步异步"
    ],
    "topics": [],
    "series": "OS",
    "group": "同步异步"
  },
  {
    "title": "CPU 性能问题排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/02-CPU性能问题排查/",
    "summary": "CPU 问题按现象分五类，本篇逐一拆解，每个现象给\"现象 → 工具 → 定位 → 修复\"的完整链路：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "文本处理三剑客 grep / awk / sed",
    "date": "2026.08",
    "path": "/kb/os/Bash/02-文本处理三剑客/",
    "summary": "这三把刀共同的工作对象是\"文本流\"。Linux 的哲学是\"一切皆文件，一切可管道\"，而文本正是进程间交换信息的最通用格式。grep 从流里挑出符合条件的行，sed 对每一行做替换/…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU内存体系与访存原理",
    "date": "2026.08",
    "path": "/kb/os/GPU/02-GPU内存体系与访存原理/",
    "summary": "GPU 的内存体系是一棵\"速度越往上越快、容量越往上越小\"的树，最关键的是理解每一级的容量量级和访问代价：",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "IO 控制方式与中断 DMA",
    "date": "2026.08",
    "path": "/kb/os/IO/02-IO控制方式与中断DMA/",
    "summary": "| 方式 | 谁在等 | 谁搬数据 | 中断次数 | 适用场景 |",
    "tags": [
      "OS",
      "IO"
    ],
    "topics": [],
    "series": "OS",
    "group": "IO"
  },
  {
    "title": "Linux 内存管理实操",
    "date": "2026.08",
    "path": "/kb/os/Linux/02-Linux内存管理实操/",
    "summary": "\"内存不够了\"是所有线上事故里最常听到的一句。但 Linux 的 free 告诉你：free 少 ≠ 内存不够，buff/cache 大 ≠ 泄漏。这一篇的目标：拿到任何一台 Li…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "系统安全威胁与攻击",
    "date": "2026.08",
    "path": "/kb/os/安全/03-系统安全威胁与攻击/",
    "summary": "要懂防御，先得懂攻击者。本篇是\"攻击者视角\"全集：代码层面的漏洞利用（缓冲区溢出、SQL 注入）、人的漏洞（社会工程）、资源层面的轰炸（DoS）。学完你应能：画出一张栈布局图解释溢…",
    "tags": [
      "OS",
      "安全"
    ],
    "topics": [],
    "series": "OS",
    "group": "安全"
  },
  {
    "title": "文件系统接口与目录结构",
    "date": "2026.08",
    "path": "/kb/os/存储/03-文件系统接口与目录结构/",
    "summary": "文件（file） 是操作系统向用户提供的最小持久化存储抽象：一个命名的字节序列。对用户而言，文件就是\"能存下来的数据集合\"；对 OS 而言，文件被映射到磁盘上的一组块（块的分配方式…",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "进程切换与调度行为",
    "date": "2026.08",
    "path": "/kb/os/进程线程/03-进程切换与调度行为/",
    "summary": "一个进程被换下 CPU 时，CPU 上残留着它的\"全部现场\"：程序计数器、寄存器组、栈指针、状态寄存器等。这些运行现场统称上下文（context）。",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "分段与段页式",
    "date": "2026.08",
    "path": "/kb/os/内存/03-分段与段页式/",
    "summary": "用户/编译器眼里的程序不是一个线性地址流，而是若干逻辑模块：",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "死锁预防",
    "date": "2026.08",
    "path": "/kb/os/死锁/03-死锁预防/",
    "summary": "死锁的四个必要条件是 01 死锁特征与必要条件 中定义的四条。预防策略就是\"打地鼠\"——只要保证至少一个条件永不成立，死锁就从\"可能发生\"变成\"不可能发生\"：",
    "tags": [
      "OS",
      "死锁"
    ],
    "topics": [],
    "series": "OS",
    "group": "死锁"
  },
  {
    "title": "管程与条件变量",
    "date": "2026.08",
    "path": "/kb/os/同步异步/03-管程与条件变量/",
    "summary": "用信号量写生产者-消费者，初值错了、顺序错了、忘记 signal，都会产生难以察觉的 bug——而这些 bug 只有并发下才复现。教材指出：信号量的错误无法轻易发现，因为\"逻辑正确…",
    "tags": [
      "OS",
      "同步异步"
    ],
    "topics": [],
    "series": "OS",
    "group": "同步异步"
  },
  {
    "title": "内存与内存泄漏排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/03-内存与内存泄漏排查/",
    "summary": "内存问题分四层，从\"系统看\"到\"进程看\"到\"内核看\"，逐层下钻：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "进程与作业控制",
    "date": "2026.08",
    "path": "/kb/os/Bash/03-进程与作业控制/",
    "summary": "命令视角的进程管理 = 看清（ps/top/htop/pstree）→ 发指令（kill/信号）→ 调度（nice/renice/chrt）→ 防干扰（作业控制/守护进程）。本文是…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU执行模型与线程调度",
    "date": "2026.08",
    "path": "/kb/os/GPU/03-GPU执行模型与线程调度/",
    "summary": "CUDA 编程模型把线程组织成三层：Grid（网格）→ Block（线程块）→ Thread（线程）。",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "内核 IO 子系统与缓冲",
    "date": "2026.08",
    "path": "/kb/os/IO/03-内核IO子系统与缓冲/",
    "summary": "关键点：read() 不是\"直接读磁盘\"——它先查 page cache；没命中才真正下发到块层。所以多次读同一个文件很快，第一次读慢。",
    "tags": [
      "OS",
      "IO"
    ],
    "topics": [],
    "series": "OS",
    "group": "IO"
  },
  {
    "title": "Linux 文件系统与磁盘实操",
    "date": "2026.08",
    "path": "/kb/os/Linux/03-Linux文件系统与磁盘实操/",
    "summary": "教材里 inode 存储文件元数据与数据块指针、目录项存储文件名与 inode 号——这些抽象在 Linux 上用 stat 一行就能看到。这一篇的目标：听到\"磁盘满了\"能立刻分清…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "恶意软件与网络攻击",
    "date": "2026.08",
    "path": "/kb/os/安全/04-恶意软件与网络攻击/",
    "summary": "恶意软件（Malware，malicious software）是\"代码化的攻击者\"，网络攻击是\"协议化的攻击者\"。本篇要建立的思维是：每种恶意软件都有独特的传播与驻留方式，每种网…",
    "tags": [
      "OS",
      "安全"
    ],
    "topics": [],
    "series": "OS",
    "group": "安全"
  },
  {
    "title": "文件系统实现",
    "date": "2026.08",
    "path": "/kb/os/存储/04-文件系统实现/",
    "summary": "一次 read() 从应用层到磁盘，经过五层：",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "线程概念与多线程模型",
    "date": "2026.08",
    "path": "/kb/os/进程线程/04-线程概念与多线程模型/",
    "summary": "线程（Thread）是进程内的一个执行单元，是 CPU 调度的基本单位。一个进程可以有一个或多个线程，它们：",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "虚拟内存与按需分页",
    "date": "2026.08",
    "path": "/kb/os/内存/04-虚拟内存与按需分页/",
    "summary": "传统加载：进程执行前，整段可执行文件必须全部装入内存。虚拟内存：只加载当前需要的页，其余页保留在磁盘（swap 区或文件）中，需要时再调入。",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "死锁避免与银行家算法",
    "date": "2026.08",
    "path": "/kb/os/死锁/04-死锁避免与银行家算法/",
    "summary": "- 安全状态（safe state）：存在一个进程执行序列 <P₁, P₂, …, Pₙ，使得对序列中的每个 Pᵢ，它当前还能申请到的资源量 ≤ 系统当前可用资源 + 序列中前面所…",
    "tags": [
      "OS",
      "死锁"
    ],
    "topics": [],
    "series": "OS",
    "group": "死锁"
  },
  {
    "title": "经典同步问题详解",
    "date": "2026.08",
    "path": "/kb/os/同步异步/04-经典同步问题详解/",
    "summary": "- 一个/多个生产者线程向缓冲区写入 item。",
    "tags": [
      "OS",
      "同步异步"
    ],
    "topics": [],
    "series": "OS",
    "group": "同步异步"
  },
  {
    "title": "磁盘与 IO 瓶颈排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/04-磁盘与IO瓶颈排查/",
    "summary": "磁盘问题先分两支——是\"没地方放\"还是\"放得太慢\"，方法完全不同：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "权限与用户管理",
    "date": "2026.08",
    "path": "/kb/os/Bash/04-权限与用户管理/",
    "summary": "Linux 里一切皆文件，访问文件靠的就是\"uid/gid + rwx 权限位\"。本篇把这些命令讲透：能创建和删除用户、能看懂账号数据库、能精确控制每个文件谁能读谁能跑、能提权又不…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "CUDA编程模型与开发入门",
    "date": "2026.08",
    "path": "/kb/os/GPU/04-CUDA编程模型与开发入门/",
    "summary": "CUDA 是\"软件定义并行\"的典范：硬件只提供海量可编程核与统一调度，而\"把问题切成无数小任务\"这件工作完全由你在代码里显式完成。",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "设备驱动与设备管理",
    "date": "2026.08",
    "path": "/kb/os/IO/04-设备驱动与设备管理/",
    "summary": "设备控制器只认识\"写寄存器、读寄存器\"。文件系统想要\"读扇区 42\"，内核统一接口是 submitbio()——但一个 NVMe 盘和一个老式 SATA 盘的寄存器布局完全不同。驱…",
    "tags": [
      "OS",
      "IO"
    ],
    "topics": [],
    "series": "OS",
    "group": "IO"
  },
  {
    "title": "Linux IO 与性能监控实操",
    "date": "2026.08",
    "path": "/kb/os/Linux/04-LinuxIO与性能监控实操/",
    "summary": "教材里讲 DMA、中断、缓冲、调度算法，但\"这台机器磁盘到底忙不忙、谁在拖慢它\"要靠 iostat 这类工具回答。这一篇的目标：看到任何一台机器，能判断瓶颈在 CPU 还是磁盘；看…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "安全防御与审计",
    "date": "2026.08",
    "path": "/kb/os/安全/05-安全防御与审计/",
    "summary": "防御不是\"装个杀毒软件\"，而是一整套系统工程：策略定规矩（最小权限）→ 架构设防线（纵深防御）→ 内核给机制（LSM/seccomp）→ 审计留证据（auditd）→ 校验防篡改（…",
    "tags": [
      "OS",
      "安全"
    ],
    "topics": [],
    "series": "OS",
    "group": "安全"
  },
  {
    "title": "文件系统性能与空间管理",
    "date": "2026.08",
    "path": "/kb/os/存储/05-文件系统性能与空间管理/",
    "summary": "块（block）是文件系统与磁盘交互的基本单位（通常 4096 B）。块大小对性能与空间都有深刻影响：",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "CPU调度算法详解",
    "date": "2026.08",
    "path": "/kb/os/进程线程/05-CPU调度算法详解/",
    "summary": "判断一个调度算法好不好，先定义度量指标。以进程 P 为例：",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "页面置换算法",
    "date": "2026.08",
    "path": "/kb/os/内存/05-页面置换算法/",
    "summary": "缺页发生时若无空闲帧，OS 选一个牺牲页（victim）腾出帧：",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "死锁实战与内核实现",
    "date": "2026.08",
    "path": "/kb/os/死锁/05-死锁实战与内核实现/",
    "summary": "| 场景 | 数据结构 | 触发方式 |",
    "tags": [
      "OS",
      "死锁"
    ],
    "topics": [],
    "series": "OS",
    "group": "死锁"
  },
  {
    "title": "现代同步原语与无锁编程",
    "date": "2026.08",
    "path": "/kb/os/同步异步/05-现代同步原语与无锁编程/",
    "summary": "编译器可能重排指令（优化），CPU 可能乱序执行（out-of-order），多核还有各自独立的缓存——于是\"线程 A 先写了 x，再写了 y\"，线程 B 看到的可能是\"y 先变，…",
    "tags": [
      "OS",
      "同步异步"
    ],
    "topics": [],
    "series": "OS",
    "group": "同步异步"
  },
  {
    "title": "并发与异常排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/05-并发与异常排查/",
    "summary": "并发与异常问题的共同特征：进程还活着，但行为异常（卡住、僵死、崩溃、悄悄变慢）。这类问题没有统一工具，必须按\"语言 → 场景\"选择武器。先看地图：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "磁盘与文件系统命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/05-磁盘与文件系统命令/",
    "summary": "../Linux/03 Linux文件系统与磁盘实操|Linux 文件实操 讲的是\"在已挂载好的文件系统上干活\"（df/du/stat/ln/fsck），本篇再往下一层：没有分区表…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "CUDA优化技术与性能调优",
    "date": "2026.08",
    "path": "/kb/os/GPU/05-CUDA优化技术与性能调优/",
    "summary": "优化的第一原则：先测量，再动手。没有数据支撑的优化都是玄学。",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "IO 路径与性能优化",
    "date": "2026.08",
    "path": "/kb/os/IO/05-IO路径与性能优化/",
    "summary": "| 指标 | 定义 | 关注点 | 单位 |",
    "tags": [
      "OS",
      "IO"
    ],
    "topics": [],
    "series": "OS",
    "group": "IO"
  },
  {
    "title": "Linux 网络与系统调用实操",
    "date": "2026.08",
    "path": "/kb/os/Linux/05-Linux网络与系统调用实操/",
    "summary": "教材讲\"系统调用是用户态进入内核态的唯一通道\"、\"进程有打开文件表\"。这篇把它们变成诊断工具：进程卡住了？strace -p 看它卡在哪个调用；连接打不开？ss -tulnp 看端…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "文件系统可靠性与日志",
    "date": "2026.08",
    "path": "/kb/os/存储/06-文件系统可靠性与日志/",
    "summary": "一次文件写操作涉及多个磁盘写：更新 inode（大小）、更新数据块、更新目录项、更新空闲位图。这些不是原子的，崩溃可能发生在任意两步之间：",
    "tags": [
      "OS",
      "存储"
    ],
    "topics": [],
    "series": "OS",
    "group": "存储"
  },
  {
    "title": "多处理器调度与实时调度",
    "date": "2026.08",
    "path": "/kb/os/进程线程/06-多处理器调度与实时调度/",
    "summary": "| | 非对称多处理（ASMP） | 对称多处理（SMP） |",
    "tags": [
      "OS",
      "进程线程"
    ],
    "topics": [],
    "series": "OS",
    "group": "进程线程"
  },
  {
    "title": "内存性能与系统调优",
    "date": "2026.08",
    "path": "/kb/os/内存/06-内存性能与系统调优/",
    "summary": "置换发生在\"帧不够用\"时，但每个进程分到多少帧先要定下来。常用两种：",
    "tags": [
      "OS",
      "内存"
    ],
    "topics": [],
    "series": "OS",
    "group": "内存"
  },
  {
    "title": "系统启动与内核崩溃排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/06-系统启动与内核崩溃/",
    "summary": "| 阶段 | 谁在干活 | 卡住的典型表现 | 去哪看 |",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "网络命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/06-网络命令/",
    "summary": "\"网络又挂了？\"先别甩锅。从本机接口、路由、DNS 到对端端口，每层都有\"一句话命令\"，把它们排成一条排查流水线：ip 看接口 → ip route 看路由 → ss 看端口 → …",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU驱动与CUDA运行时栈",
    "date": "2026.08",
    "path": "/kb/os/GPU/06-GPU驱动与CUDA运行时栈/",
    "summary": "GPU 有自己的\"操作系统\"：驱动 + 运行时 + 一堆库。理解这条栈，是理解显存管理（07 GPU内存管理与显存分配）、多进程调度（08 GPU上下文与多进程调度）、容器化（10…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "Linux 安全权限与审计",
    "date": "2026.08",
    "path": "/kb/os/Linux/06-Linux安全权限与审计/",
    "summary": "教材说\"保护 = 主体对客体的一组访问权限\"，Linux 的经典实现是 rwx 三元组；但生产环境需要更细：ACL 给指定用户单独授权、capabilities 把 root 拆成…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "进程与调度异常疑难排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/07-进程与调度异常疑难/",
    "summary": "进程与调度问题最迷惑人的地方：系统\"看起来\"坏在 CPU 上，根因却在 IO、锁、内核等待上。先看地图：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "系统监控与性能命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/07-系统监控与性能命令/",
    "summary": "\"系统慢死了\"这句话没有信息量。负载多高算高？CPU 的 us/wa 哪个该紧张？free 只剩几十 MB 到底危不危险？ 本篇的目标：任何一台 Linux，你都能用 5 分钟拿到…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU内存管理与显存分配",
    "date": "2026.08",
    "path": "/kb/os/GPU/07-GPU内存管理与显存分配/",
    "summary": "先建立一张 API 地图。CUDA 提供多个入口分配内存，用途各不相同：",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "Linux 内核架构与启动原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/07-Linux内核架构与启动原理/",
    "summary": "实操篇里你用过 ps 看到 PID 1 的 systemd、用 strace 抓到每一次系统调用、用 dmesg 看过启动日志——它们背后是同一个内核。本篇把镜头拉远：先看整台\"内…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "虚拟内存与交换疑难排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/08-虚拟内存与交换疑难/",
    "summary": "虚拟内存疑难从\"换页发生地\"到\"分配失败点\"，层层下钻。排查方法论见 00 系统问题排查方法论，底层机制原理见 ../Linux/10 Linux内存管理内核原理|内存内核：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "Shell 脚本编程进阶",
    "date": "2026.08",
    "path": "/kb/os/Bash/08-Shell脚本编程进阶/",
    "summary": "命令是积木，脚本是把积木钉成房子。读懂本篇后，09 高级命令与文本处理 的 xargs/管道流、10 实用命令组合与技巧 的一行流都能看穿本质。写脚本第一准则：所有变量加双引号、所…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU上下文与多进程调度",
    "date": "2026.08",
    "path": "/kb/os/GPU/08-GPU上下文与多进程调度/",
    "summary": "CUDA Context（CUDA 上下文）是进程在一张 GPU 上拥有的资源集合，类比 CPU 世界里进程的 PCB（进程控制块）：",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "进程与线程内核原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/08-Linux进程与线程内核原理/",
    "summary": "教材把进程讲成\"程序 + 运行状态\"，Linux 内核里这个\"运行状态\"就是 struct taskstruct。这一篇是\"内核原理\"系列第 2 篇（上一篇见 07 Linux内核…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "文件系统与磁盘故障排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/09-文件系统与磁盘故障/",
    "summary": "文件系统故障按四层拆解——元数据层（文件系统本身）、挂载层（fstab/vfs）、块设备层（磁盘硬件）、卷管理层（LVM/RAID），排查从内到外：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "高级命令与文本处理",
    "date": "2026.08",
    "path": "/kb/os/Bash/09-高级命令与文本处理/",
    "summary": "前面的管道 | 只能\"把 A 的输出喂给 B 的输入\"，而 rm/cp/mkdir 这类命令不吃 stdin、只吃命令行参数。这一篇专门补这些缺口：参数怎么传、输出怎么存、超时怎么…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU虚拟化与MIG技术",
    "date": "2026.08",
    "path": "/kb/os/GPU/09-GPU虚拟化与MIG技术/",
    "summary": "- 共享成本：一块 A100/H100 数十万元，独占利用率往往只有 20-50%，切分共享能摊薄成本；",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "Linux 调度器原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/09-Linux调度器原理/",
    "summary": "在 01 Linux进程与调度实操|01 篇 里，ps 的 PRI/NI 列只是\"显示出来的数字\"。这一篇回答：这个数字在内核里到底怎么存、怎么换算、怎么变成 CPU 时间。调度器…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "系统调用与错误码疑难排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/10-系统调用与错误码疑难/",
    "summary": "排查系统调用失败，最怕的不是不会敲命令，而是把 errno 当返回值读、把 EAGAIN 当致命错误、把 EINTR 当 bug。先建立一张总地图：",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "实用命令组合与技巧",
    "date": "2026.08",
    "path": "/kb/os/Bash/10-实用命令组合与技巧/",
    "summary": "场景：登录服务器第一件事，5 秒判断\"机器健康吗\"：",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU容器化与Kubernetes调度",
    "date": "2026.08",
    "path": "/kb/os/GPU/10-GPU容器化与Kubernetes调度/",
    "summary": "容器化解决的是\"交付\"问题：让应用连同它依赖的 CUDA 版本、cuBLAS/cuDNN 等库一起打包，换机器不换环境。而 GPU 是宿主机的物理设备，容器要\"借\"它，必须由宿主机…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "Linux 内存管理内核原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/10-Linux内存管理内核原理/",
    "summary": "free 只告诉你\"还剩多少\"，内核实际在做的是：给进程的虚拟地址建立映射、把物理页框切成块发出去、缺页时现场补上、不够时从 LRU 上回收、回收不了就杀人。本篇按这条主线，把 L…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "内核同步与锁疑难排查",
    "date": "2026.08",
    "path": "/kb/os/问题排查/11-内核同步与锁疑难/",
    "summary": "现象：同样的锁问题，用户态用 pthread mutex 就完了；内核里却要分四大家族——自旋锁、互斥锁、读写锁、RCU。选错类型轻则性能烂，重则死机。难点是它们各有严格的使用上下…",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "远程操作与文件同步",
    "date": "2026.08",
    "path": "/kb/os/Bash/11-远程操作与文件同步/",
    "summary": "预期输出（-v 时追加）：",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU监控与运维实践",
    "date": "2026.08",
    "path": "/kb/os/GPU/11-GPU监控与运维实践/",
    "summary": "上一章 10 GPU容器化与Kubernetes调度 把 GPU 发给了容器，本章回答\"发出去之后怎么管\"。监控的核心不是\"看数字\"，而是把每个数字翻译成行动：利用率低是空转还是瓶…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "文件系统内核原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/11-Linux文件系统内核原理/",
    "summary": "03 Linux文件系统与磁盘实操|03 篇 回答了\"命令能看到什么\"，本篇回答\"内核里到底存了什么\"。两者对照着看：stat 读出的每个字段，都能在 struct inode 里…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "疑难案例集锦",
    "date": "2026.08",
    "path": "/kb/os/问题排查/12-疑难案例集锦/",
    "summary": "| 案例 | 现象一句话 | 根因类别 | 核心工具 | 对应篇章 |",
    "tags": [
      "OS",
      "问题排查"
    ],
    "topics": [],
    "series": "OS",
    "group": "问题排查"
  },
  {
    "title": "服务管理与定时任务",
    "date": "2026.08",
    "path": "/kb/os/Bash/12-服务管理与定时任务/",
    "summary": "服务管理 = 定义（Unit 文件）→ 控制（systemctl）→ 观察（journalctl/status）→ 自动化（cron/at/timer）。本篇是 00 Bash命令…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU性能分析与Profiling工具",
    "date": "2026.08",
    "path": "/kb/os/GPU/12-GPU性能分析与Profiling工具/",
    "summary": "上一章 11 GPU监控与运维实践 回答\"卡用得好不好\"（集群视角、粗粒度）；本章回答\"为什么不够快\"（单任务视角、细粒度）。两者互补：监控发现问题，Profiling 定位问题。…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "IO 栈内核原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/12-LinuxIO栈内核原理/",
    "summary": "实操篇告诉我们\"慢\"，本篇回答为什么慢：调度器排队？单队列锁竞争？还是 DMA 与 cache 一致性？看完你将能画出完整 IO 路径，并理解 iouring 为何是异步 IO 的…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "调试与追踪工具",
    "date": "2026.08",
    "path": "/kb/os/Bash/13-调试与追踪工具/",
    "summary": "上篇教会你\"卡住用 strace、热点用 perf、看栈用 gdb\"。本篇把这三件工具加满，再补上另外三个：ltrace 看库函数、bpftrace 一行脚本追踪内核、valgri…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "大模型训练推理GPU实践",
    "date": "2026.08",
    "path": "/kb/os/GPU/13-大模型训练推理GPU实践/",
    "summary": "前置基础：01 GPU硬件架构与工作原理、02 GPU内存体系与访存原理、07 GPU内存管理与显存分配、10 GPU容器化与Kubernetes调度。性能剖析工具见 12 GPU…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "网络栈内核原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/13-Linux网络栈内核原理/",
    "summary": "理论篇已经在 ../IO/03 内核IO子系统与缓冲|IO 子系统 讲过\"设备→内核→进程\"的通用 IO 路径，本篇专注网络这条特殊 IO 路径：它有伪文件、有协议状态机、有软中断…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "包管理与软件安装",
    "date": "2026.08",
    "path": "/kb/os/Bash/14-包管理与软件安装/",
    "summary": "软件安装是运维的第一课：装错体系、装坏依赖、锁文件卡死、软件源失效，每类坑后面都有清晰路径。本篇把 Debian 系（apt/dpkg）与 RHEL 系（dnf/rpm）两条主线平…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "GPU故障排查与问题定位",
    "date": "2026.08",
    "path": "/kb/os/GPU/14-GPU故障排查与问题定位/",
    "summary": "前置基础：06 GPU驱动与CUDA运行时栈、07 GPU内存管理与显存分配、08 GPU上下文与多进程调度；日常监控手段见 11 GPU监控与运维实践，性能类问题见 12 GPU…",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "Linux 安全机制内核原理",
    "date": "2026.08",
    "path": "/kb/os/Linux/14-Linux安全机制内核原理/",
    "summary": "06 篇讲的是\"怎么用\"（chmod/setcap/auditctl 这些命令），本篇讲\"内核凭什么\"。Linux 安全不是单一机制，而是一组机制按\"纵深防御\"叠在一起：权限位管 …",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "防火墙与网络安全命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/15-防火墙与网络安全命令/",
    "summary": "Linux 世界有\"祖孙三代\"防火墙：iptables（老牌，最通用）、nftables（内核新框架，替代者）、firewalld/ufw（面向普通用户的封装）。本机和云上服务器出…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "国产GPU与异构计算生态",
    "date": "2026.08",
    "path": "/kb/os/GPU/15-国产GPU与异构计算生态/",
    "summary": "前置基础：04 CUDA编程模型与开发入门、06 GPU驱动与CUDA运行时栈、13 大模型训练推理GPU实践。本文所有对比都以 NVIDIA/CUDA 为基准参照物。",
    "tags": [
      "OS",
      "GPU"
    ],
    "topics": [],
    "series": "OS",
    "group": "GPU"
  },
  {
    "title": "文件描述符详解",
    "date": "2026.08",
    "path": "/kb/os/Linux/15-文件描述符详解/",
    "summary": "教材说\"打开文件返回文件描述符\"，但很少解释\"描述符\"三个字。它既不存文件内容，也不存文件名，只是一个非负整数。可就是这个整数，同时串起了08 Linux进程与线程内核原理|进程、…",
    "tags": [
      "OS",
      "Linux"
    ],
    "topics": [],
    "series": "OS",
    "group": "Linux"
  },
  {
    "title": "二进制与安全审计命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/16-二进制与安全审计命令/",
    "summary": "前面的命令操作的都是\"文本\"，而 .so、可执行程序、固件、证书这些是二进制——直接 cat 会吐出一堆乱码。这一篇交给专门的\"解剖工具\"：binutils（file/readel…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "内核模块硬件与系统参数命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/17-内核模块硬件与系统参数命令/",
    "summary": "这组命令分别观察 /proc、/sys、/dev、内核环形缓冲区和 journal。学习重点不是背选项，而是回答：当前状态是什么、修改影响哪一层、故障后如何回滚。",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "结构化数据处理命令：JSON / YAML / XML / CSV",
    "date": "2026.08",
    "path": "/kb/os/Bash/18-结构化数据处理命令/",
    "summary": "纯文本工具看见的是字符，结构化工具看见的是对象、数组、字段、类型和转义规则。",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "时间、终端与环境管理命令",
    "date": "2026.08",
    "path": "/kb/os/Bash/19-时间终端与环境管理命令/",
    "summary": "前置组合技巧见 10 实用命令组合与技巧，远程终端与持久会话见 11 远程操作与文件同步，时间同步服务与定时任务见 12 服务管理与定时任务，综合排障方法可迁移到 ../问题排查/…",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "现代高效命令行工具",
    "date": "2026.08",
    "path": "/kb/os/Bash/20-现代高效命令行工具/",
    "summary": "| 层次 | 命令 | 结论 |",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "Linux 命令场景与字母索引",
    "date": "2026.08",
    "path": "/kb/os/Bash/21-Linux命令场景与字母索引/",
    "summary": "| 层次 | 解决的问题 | 阅读入口 |",
    "tags": [
      "OS",
      "Bash"
    ],
    "topics": [],
    "series": "OS",
    "group": "Bash"
  },
  {
    "title": "Lua 5.5 语法教程",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/00-Lua-5.5-语法教程索引/",
    "summary": "title: Lua 5.5 语法教程",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "FastAPI 学习路线",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/",
    "summary": "FastAPI 应用可以从六个维度理解：",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "《Python asyncio 并发编程》读书笔记",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/",
    "summary": "title: Python asyncio并发编程读书笔记",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "TypeScript 7.0 核心语法教程",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/00-TypeScript-7.0-核心语法教程索引/",
    "summary": "title: TypeScript 7.0 核心语法教程",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "JavaScript 概述",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/01-JavaScript概述/",
    "summary": "title: JavaScript 概述",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 1 章：安装运行与词法结构",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/01-安装运行与词法结构/",
    "summary": "- 理解 Lua 作为库、独立解释器和编译器的三种形态。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "FastAPI 架构与第一个应用",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/01-FastAPI-架构与第一个应用/",
    "summary": "本篇从运行链路出发，解释 FastAPI、Starlette、Pydantic、Uvicorn 和 ASGI 各自负责什么，并创建第一个具有参数校验、依赖注入和 OpenAPI 文…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第1章 认识 asyncio",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/01-第1章-认识-asyncio/",
    "summary": "- 区分 I/O 密集型与 CPU 密集型工作，并为它们选择合适的并发工具。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "安装工具链与第一个项目",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/01-安装工具链与第一个项目/",
    "summary": "- 理解 TypeScript、Node.js、npm 与 tsc 各自负责什么",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "HTML 中的 JavaScript",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/02-HTML中的JavaScript/",
    "summary": "title: HTML 中的 JavaScript",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 2 章：值类型与运算符",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/02-值类型与运算符/",
    "summary": "- 掌握 Lua 的八种基本类型和引用语义。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "路径查询请求头与 Cookie",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/02-路径查询请求头与-Cookie/",
    "summary": "FastAPI 根据函数签名判断参数来源：路径模板中的同名参数来自 path；普通标量通常来自 query；Header() 和 Cookie() 则显式声明请求头和 Cookie…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第2章 asyncio 基础",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/02-第2章-asyncio-基础/",
    "summary": "- 用 async def 定义协程，用 await 表达暂停点和依赖关系。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "基础类型变量与类型推断",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/02-基础类型变量与类型推断/",
    "summary": "- 掌握 JavaScript 原始值对应的 TypeScript 类型",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "JavaScript 语言基础",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/03-语言基础/",
    "summary": "title: JavaScript 语言基础",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 3 章：变量作用域与 Lua 5.5 global 声明",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/03-变量作用域与-Lua-5.5-global-声明/",
    "summary": "Lua 有局部变量、全局变量和表字段。参数等价于局部变量。局部声明从声明后的第一条语句开始生效，到包含它的最内层 block 结束。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "请求体与 Pydantic v2",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/03-请求体与-Pydantic-v2/",
    "summary": "请求体通常承载结构化 JSON。FastAPI 根据 Pydantic v2 模型解析输入、执行校验、生成 JSON Schema，并把验证后的模型交给路径操作函数。本篇覆盖嵌套模…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第3章 第一个 asyncio 应用",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/",
    "summary": "- 理解 TCP socket 的监听、接受连接、收发字节和关闭过程。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "对象类型接口与类型别名",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/03-对象类型接口与类型别名/",
    "summary": "- 用匿名对象类型、interface 和 type 描述数据结构",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "变量、作用域与内存",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/04-变量作用域与内存/",
    "summary": "title: 变量、作用域与内存",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 4 章：语句与控制流程",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/04-语句与控制流程/",
    "summary": "block 是顺序执行的语句列表。do ... end 创建显式块，常用于缩小局部变量作用域。分号通常可省略，但以 ( 开头的新语句可能与上一行函数调用产生语法歧义，此时应写 ;(…",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "表单与文件上传",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/04-表单与文件上传/",
    "summary": "浏览器表单和文件上传不使用 JSON 请求体。普通表单通常是 application/x-www-form-urlencoded，包含文件时使用 multipart/form-da…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第4章 并发 Web 请求",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/04-第4章-并发-Web-请求/",
    "summary": "- 使用异步上下文管理器可靠管理 ClientSession 和响应体。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "函数类型重载与this",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/04-函数类型重载与this/",
    "summary": "- 为参数和返回值添加恰当注解",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "基本引用类型",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/05-基本引用类型/",
    "summary": "title: 基本引用类型",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 5 章：函数闭包与多返回值",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/05-函数闭包与多返回值/",
    "summary": "函数可以存入变量和表、作为参数传递、从函数返回：",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "{\"created_at\": \"...ISO 8601...\"}",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/05-响应模型错误与状态码/",
    "summary": "响应是公开 API 的最后一道边界。FastAPI 可以根据返回类型或 responsemodel 校验、序列化并过滤输出；也可以直接返回 Starlette Response 获…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第5章 非阻塞数据库驱动",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/05-第5章-非阻塞数据库驱动/",
    "summary": "- 理解为什么同步数据库驱动会阻塞事件循环，并使用 asyncpg 连接 PostgreSQL。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "联合、交叉、窄化与穷尽检查",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/05-联合交叉窄化与穷尽检查/",
    "summary": "04 函数类型重载与this|上一章 · 06 泛型约束与类型参数设计|下一章",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "集合引用类型",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/06-集合引用类型/",
    "summary": "title: 集合引用类型",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 6 章：表、数组与迭代器",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/06-表数组与迭代器/",
    "summary": "table 是关联数组，键可以是除 nil 和 NaN 外的任意 Lua 值，值可以是任意值。不存在的键读取为 nil，赋 nil 删除键。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "依赖注入系统",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/06-依赖注入系统/",
    "summary": "依赖注入（Dependency Injection，DI）把“如何取得某个值或资源”从路径操作中抽离。FastAPI 不需要容器注册表：任何可调用对象都可以是依赖，函数参数签名就是…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 6 章 处理 CPU 密集型任务",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/06-第6章-处理-CPU-密集型任务/",
    "summary": "- 区分 I/O 密集型与 CPU 密集型工作，解释 CPU 代码为何会阻塞事件循环。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "泛型约束与类型参数设计",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/06-泛型约束与类型参数设计/",
    "summary": "05 联合交叉窄化与穷尽检查|上一章 · 07 keyof typeof索引访问与类型查询|下一章",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "迭代器与生成器",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/07-迭代器与生成器/",
    "summary": "title: 迭代器与生成器",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 7 章：元表、元方法与面向对象",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/07-元表元方法与面向对象/",
    "summary": "每个值都可以关联 metatable，它是描述值在特定事件下行为的普通 table。table 和 full userdata 每个对象可有独立 metatable；其他类型通常每…",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "安全认证与授权",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/07-安全认证与授权/",
    "summary": "认证回答“你是谁”，授权回答“你能做什么”。OAuth2 Password Bearer 约定客户端用用户名/密码换取 bearer token；JWT 是 token 的一种自包…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 7 章 使用线程处理阻塞任务",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/07-第7章-使用线程处理阻塞任务/",
    "summary": "- 理解 threading、ThreadPoolExecutor 与 asyncio Task 的职责差异。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "keyof、typeof、索引访问与类型查询",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/07-keyof-typeof索引访问与类型查询/",
    "summary": "06 泛型约束与类型参数设计|上一章 · 08 条件类型映射类型与模板字面量|下一章",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "对象、类与面向对象编程",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/08-对象类与面向对象编程/",
    "summary": "title: 08 对象、类与面向对象编程",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 8 章：错误处理与资源关闭",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/08-错误处理与资源关闭/",
    "summary": "error(value , level) 抛出错误且不返回。Lua 自身通常抛字符串，但程序可抛除 nil 外的任意值。库边界最好统一错误对象约定，否则日志和调用方处理会混乱。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "SQL 数据库与事务",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/08-SQL-数据库与事务/",
    "summary": "本篇以 FastAPI 官方 SQLModel 同步示例为起点。SQLModel 建立在 SQLAlchemy 和 Pydantic 之上，适合展示模型、Session 与响应校验…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 8 章 Streams",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/08-第8章-Streams/",
    "summary": "- 理解 transport 负责“怎么传”、protocol 负责“收到后做什么”。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "条件类型、映射类型与模板字面量",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/08-条件类型映射类型与模板字面量/",
    "summary": "07 keyof typeof索引访问与类型查询|上一章 · 09 工具类型与类型体操实践|下一章",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "代理与反射",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/09-代理与反射/",
    "summary": "title: 09 代理与反射",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 9 章：协程与协作式并发",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/09-协程与协作式并发/",
    "summary": "Lua coroutine 是独立执行流，只有显式 yield 才暂停。默认没有并行、抢占、网络事件循环或自动调度；I/O 是否阻塞取决于宿主和库。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "异步并发后台任务与生命周期",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/09-异步并发后台任务与生命周期/",
    "summary": "FastAPI 基于 ASGI、Starlette 和 AnyIO。高并发来自等待 I/O 时让出事件循环，不意味着一段 Python 代码能自动并行，也不意味着把所有函数改成 a…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 9 章 Web 应用",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/09-第9章-Web-应用/",
    "summary": "- 使用 aiohttp.web 构建异步 HTTP 服务，并正确管理 ClientSession。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "工具类型与类型体操实践",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/09-工具类型与类型体操实践/",
    "summary": "- 用标准工具类型从已有类型派生新类型，避免重复声明。",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "函数",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/10-函数/",
    "summary": "- 理解函数声明、函数表达式、箭头函数和方法的语义差异。",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 10 章：字符串、模式与 UTF-8",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/10-字符串模式与-UTF-8/",
    "summary": "Lua string 不可变、可包含 \\0、不知道编码。长度和下标默认按字节：",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "大型应用配置与工程结构",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/10-大型应用配置与工程结构/",
    "summary": "大型应用不等于堆叠抽象层。先按业务边界拆 Router、模型、依赖和配置，保持单向依赖；只有出现真实复用或复杂领域规则时再引入 service/repository。",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 10 章 微服务",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/10-第10章-微服务/",
    "summary": "- 理解 Backend for Frontend（BFF）的聚合职责与风险。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "类抽象类与面向对象",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/10-类抽象类与面向对象/",
    "summary": "- 正确声明字段、构造器、可见性、只读成员和静态成员。",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "Promise 与异步函数",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/11-Promise与异步函数/",
    "summary": "title: 11 Promise 与异步函数",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 11 章：标准库实用指南",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/11-标准库实用指南/",
    "summary": "Lua 标准库刻意精简，覆盖基础操作、协程、模块、字符串、UTF-8、表、数学、I/O、操作系统和调试。网络、JSON、数据库、加密等不在标准库内，需要宿主或第三方模块。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "中间件、CORS 与反向代理",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/11-中间件-CORS-与反向代理/",
    "summary": "中间件包裹整个 ASGI 应用，能处理 HTTP 请求进入前、响应返回后以及异常。app.addmiddleware(A) 后再添加 B，实际调用栈是 最后添加的在最外层：请求 B…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 11 章：同步原语",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/11-第11章-同步原语/",
    "summary": "- Lock 保护跨暂停点的不变量；Semaphore 限制并发容量；BoundedSemaphore 还能发现多余释放。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "模块 ESM、CommonJS 与模块解析",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/11-模块ESM-CommonJS与模块解析/",
    "summary": "- 使用标准 ESM 导入、导出、类型导入和动态导入。",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "BOM",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/12-BOM/",
    "summary": "title: 12 BOM",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 12 章：模块、require 与受控环境",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/12-模块-require-与受控环境/",
    "summary": "现代 Lua 模块通常在文件中创建 local table 并 return，不向 G 写入模块名。",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "WebSocket、SSE 与流式响应",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/12-WebSocket-SSE-与流式响应/",
    "summary": "| 技术 | 方向/协议 | 适合 | 主要限制 |",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 12 章：异步队列",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/12-第12章-异步队列/",
    "summary": "- Queue：FIFO；PriorityQueue：最小项优先；LifoQueue：后进先出。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "声明文件、类型包与库发布",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/12-声明文件类型包与库发布/",
    "summary": "- 理解 .d.ts、ambient declaration 与普通 .ts 实现的边界。",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "客户端检测",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/13-客户端检测/",
    "summary": "title: 13 客户端检测",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 13 章：垃圾回收、弱表与终结器",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/13-垃圾回收弱表与终结器/",
    "summary": "Lua 自动管理 string、table、function、thread、full userdata 和内部结构。对象不再能从 Lua 根集合访问时可被回收；具体回收时间不确定。…",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "测试与调试",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/13-测试与调试/",
    "summary": "FastAPI 的 TestClient 基于 Starlette 和 HTTPX，在同一进程直接调用 ASGI 应用，无真实 TCP，适合快速接口测试。异步测试直接使用 HTTP…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 13 章：管理子进程",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/13-第13章-管理子进程/",
    "summary": "- 默认用 createsubprocessexec()；确需 shell 语法才用 createsubprocessshell()。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "Promise、异步迭代器与资源管理",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/13-Promise异步迭代器与资源管理/",
    "summary": "学习异步代码最容易犯的错误，是看到编辑器不报错便认为代码一定能运行。",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "DOM",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/14-DOM/",
    "summary": "title: 14 DOM",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 14 章：Lua 5.5 新特性与迁移指南",
    "date": "2026.08",
    "path": "/kb/language/Lua/语法教程/14-Lua-5.5-新特性与迁移指南/",
    "summary": "5.5 新增 global 关键字和声明语义：",
    "tags": [
      "Language",
      "Lua",
      "语法教程"
    ],
    "topics": [],
    "series": "Language",
    "group": "语法教程"
  },
  {
    "title": "OpenAPI 文档与客户端生成",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/14-OpenAPI-文档与客户端生成/",
    "summary": "FastAPI 根据路由、依赖、Pydantic 模型生成 OpenAPI 3.1 schema，默认在 /openapi.json；Swagger UI 默认 /docs，ReD…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "第 14 章：高级 asyncio",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/14-第14章-高级-asyncio/",
    "summary": "- 为库设计同步/异步双 API，而不嵌套事件循环。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "tsconfig 工程实践、测试与 JavaScript 迁移",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/",
    "summary": "tsconfig.json 不只是选项集合。它同时回答两个问题：",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "DOM 扩展",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/15-DOM扩展/",
    "summary": "title: DOM 扩展",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "部署、容器、性能与生产实践",
    "date": "2026.08",
    "path": "/kb/language/Python/服务框架/FastAPI/15-部署容器性能与生产实践/",
    "summary": "fastapi dev main.py 面向本地开发：自动 reload、监听本机、详细日志，不用于生产。fastapi run main.py 面向生产，底层运行 Uvicorn…",
    "tags": [
      "Language",
      "Python",
      "服务框架",
      "FastAPI"
    ],
    "topics": [],
    "series": "Language",
    "group": "FastAPI"
  },
  {
    "title": "现代 asyncio 补遗",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/15-现代-asyncio-补遗/",
    "summary": "- 3.11：TaskGroup、ExceptionGroup / except、timeout() / timeoutat()、Runner。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "TypeScript 7 版本迁移与最佳实践",
    "date": "2026.08",
    "path": "/kb/language/TypeScript/核心语法/15-TypeScript-7版本迁移与最佳实践/",
    "summary": "TypeScript 7 不是简单地在旧编译器上加几个语法特性，而是 TypeScript 工具链的原生 Go 端口。官方发布文称，完整构建通常获得 8-12 倍加速，并将其概括为…",
    "tags": [
      "Language",
      "TypeScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "DOM2 与 DOM3",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/16-DOM2与DOM3/",
    "summary": "title: DOM2 与 DOM3",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "第 16 章：asyncio 测试与调试",
    "date": "2026.08",
    "path": "/kb/language/Python/异步处理/16-asyncio-测试与调试/",
    "summary": "- 用 unittest.IsolatedAsyncioTestCase 为每个测试建立隔离事件循环。",
    "tags": [
      "Language",
      "Python",
      "异步处理"
    ],
    "topics": [],
    "series": "Language",
    "group": "异步处理"
  },
  {
    "title": "事件",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/17-事件/",
    "summary": "- 理解捕获、目标、冒泡三个传播阶段及默认行为。",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "动画与 Canvas 图形",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/18-动画与Canvas图形/",
    "summary": "title: 动画与 Canvas 图形",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "表单脚本",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/19-表单脚本/",
    "summary": "- 掌握表单控件访问、提交、重置和序列化。",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "JavaScript API",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/20-JavaScript-API/",
    "summary": "title: JavaScript API",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "错误处理与调试",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/21-错误处理与调试/",
    "summary": "title: 错误处理与调试",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "XML 与 JSON",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/22-XML与JSON/",
    "summary": "title: XML 与 JSON",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "网络请求与远程资源",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/23-网络请求与远程资源/",
    "summary": "title: 网络请求与远程资源",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "客户端存储",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/24-客户端存储/",
    "summary": "- 区分 Cookie、Web Storage、IndexedDB 与 Cache API",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "模块",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/25-模块/",
    "summary": "- architecture",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "工作者线程",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/26-工作者线程/",
    "summary": "- concurrency",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "最佳实践",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/27-最佳实践/",
    "summary": "- best-practices",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "未来展望",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/28-未来展望/",
    "summary": "- web-platform",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "JavaScript 核心语法完整教程",
    "date": "2026.08",
    "path": "/kb/language/JavaScript/核心语法/README/",
    "summary": "title: JavaScript 核心语法完整教程",
    "tags": [
      "Language",
      "JavaScript",
      "核心语法"
    ],
    "topics": [],
    "series": "Language",
    "group": "核心语法"
  },
  {
    "title": "Python 3.12 新特性详解",
    "date": "2026.08",
    "path": "/kb/language/Python/版本特性/Python-3.12-新特性详解/",
    "summary": "Python 3.12 是 CPython 多核路线的基础版本：它通过 PEP 684 实现了每解释器独立 GIL，但 3.12 只提供 C API，普通 threading 和 …",
    "tags": [
      "Language",
      "Python",
      "版本特性"
    ],
    "topics": [],
    "series": "Language",
    "group": "版本特性"
  },
  {
    "title": "Python 3.13 新特性详解",
    "date": "2026.08",
    "path": "/kb/language/Python/版本特性/Python-3.13-新特性详解/",
    "summary": "Python 3.13 首次把“同一解释器内真正的 CPU 密集多线程”带给用户：专用 free-threaded 构建可在运行时关闭 GIL，让多个线程同时执行 Python 代…",
    "tags": [
      "Language",
      "Python",
      "版本特性"
    ],
    "topics": [],
    "series": "Language",
    "group": "版本特性"
  },
  {
    "title": "Python 3.14 新特性详解",
    "date": "2026.08",
    "path": "/kb/language/Python/版本特性/Python-3.14-新特性详解/",
    "summary": "Python 3.14 把 3.12 和 3.13 的多核路线推向可用阶段：free-threaded 构建从实验性升级为官方支持但仍可选，标准库首次提供 concurrent.i…",
    "tags": [
      "Language",
      "Python",
      "版本特性"
    ],
    "topics": [],
    "series": "Language",
    "group": "版本特性"
  },
  {
    "title": "Python 3.15 新特性详解",
    "date": "2026.08",
    "path": "/kb/language/Python/版本特性/Python-3.15-新特性详解/",
    "summary": "Python 3.15 RC1 没有宣布默认关闭 GIL，也没有改变普通 CPython 中 ThreadPoolExecutor 的纯 Python CPU 并行语义。它重点完善…",
    "tags": [
      "Language",
      "Python",
      "版本特性"
    ],
    "topics": [],
    "series": "Language",
    "group": "版本特性"
  },
  {
    "title": "Python 3.16 新特性详解",
    "date": "2026.08",
    "path": "/kb/language/Python/版本特性/Python-3.16-新特性详解/",
    "summary": "当前 3.16 草案还没有核心语言 headline，也没有 GIL/free-threading 的版本专项新承诺。并发方面已经记录的变化主要是：彻底移除 asyncio eve…",
    "tags": [
      "Language",
      "Python",
      "版本特性"
    ],
    "topics": [],
    "series": "Language",
    "group": "版本特性"
  },
  {
    "title": "提示词工程学习路线与文档索引",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/00-提示词工程学习路线与文档索引/",
    "summary": "1. 提示词影响概率模型的输出分布，不像普通程序那样保证唯一执行路径。",
    "tags": [
      "AI",
      "提示词工程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词工程"
  },
  {
    "title": "Ray Core 学习路线",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/00-Ray-Core-学习路线/",
    "summary": "当前目录中的专题文章适合系统学习和按问题检索；从本页按推荐顺序阅读即可。",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "摘要、改写、翻译与内容创作",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/01-摘要改写翻译与内容创作/",
    "summary": "先区分“忠实变换”和“受约束创作”。摘要、改写、翻译默认不得引入源文没有的事实；创作也必须标出已知事实、合理设定与待核实内容。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "RAG 提示词与基于证据的回答",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/工程化与安全/01-RAG提示词与基于证据的回答/",
    "summary": "RAG（Retrieval-Augmented Generation）的目标不是“让模型知道更多”，而是让系统在给定证据、权限与时效边界内生成可核验的回答。",
    "tags": [
      "AI",
      "提示词工程",
      "工程化与安全"
    ],
    "topics": [],
    "series": "AI",
    "group": "工程化与安全"
  },
  {
    "title": "通用任务提示词模板",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/模板库/01-通用任务提示词模板/",
    "summary": "这套模板用于把模糊请求转成可评测的任务契约。",
    "tags": [
      "AI",
      "提示词工程",
      "模板库"
    ],
    "topics": [],
    "series": "AI",
    "group": "模板库"
  },
  {
    "title": "提示词工程基础与核心心智模型",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词教程/01-提示词工程基础与核心心智模型/",
    "summary": "本章建立后续实践所需的心智模型。",
    "tags": [
      "AI",
      "提示词工程",
      "提示词教程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词教程"
  },
  {
    "title": "从模糊需求到可测试提示词",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词优化/01-从模糊需求到可测试提示词/",
    "summary": "- 下一章：02 提示词诊断错误分类与最小修改",
    "tags": [
      "AI",
      "提示词工程",
      "提示词优化"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词优化"
  },
  {
    "title": "权威在线资料、论文与课程",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/资料与书单/01-权威在线资料论文与课程/",
    "summary": "本页优先收录官方文档、原始论文、标准框架和长期维护的公开课程。",
    "tags": [
      "AI",
      "提示词工程",
      "资料与书单"
    ],
    "topics": [],
    "series": "AI",
    "group": "资料与书单"
  },
  {
    "title": "Ray Core 架构与运行时",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/01-架构与运行时/",
    "summary": "本文建立一套能解释 Task、Actor 和 Object 行为的运行时心智模型。Task 细节见 02 Task 深入，流式返回见 03 Ray Generator，对象与序列化…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "信息抽取、分类打标与结构化转换",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/02-信息抽取分类打标与结构化转换/",
    "summary": "先定义 schema，再设计提示。null 表示字段适用但未提供，unknown 表示材料存在但无法判定；二者不得与空字符串、false 或模型猜测混用。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "工具调用 Agent 提示词与状态机",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/工程化与安全/02-工具调用Agent提示词与状态机/",
    "summary": "工具调用 Agent 是“模型提出受约束动作，应用验证并执行动作”的系统。",
    "tags": [
      "AI",
      "提示词工程",
      "工程化与安全"
    ],
    "topics": [],
    "series": "AI",
    "group": "工程化与安全"
  },
  {
    "title": "提示词需求评审模板",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/模板库/02-提示词需求评审模板/",
    "summary": "- 01 通用任务提示词模板",
    "tags": [
      "AI",
      "提示词工程",
      "模板库"
    ],
    "topics": [],
    "series": "AI",
    "group": "模板库"
  },
  {
    "title": "提示词结构角色指令上下文与约束",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词教程/02-提示词结构角色指令上下文与约束/",
    "summary": "- 区分消息角色与提示词逻辑组件。",
    "tags": [
      "AI",
      "提示词工程",
      "提示词教程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词教程"
  },
  {
    "title": "提示词诊断：错误分类与最小修改",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词优化/02-提示词诊断错误分类与最小修改/",
    "summary": "- 上一章：01 从模糊需求到可测试提示词",
    "tags": [
      "AI",
      "提示词工程",
      "提示词优化"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词优化"
  },
  {
    "title": "提示词工程书单与阅读建议",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/资料与书单/02-提示词工程书单与阅读建议/",
    "summary": "书籍适合建立稳定的概念框架、案例组织和工程思维，但不适合充当最新 API reference。",
    "tags": [
      "AI",
      "提示词工程",
      "资料与书单"
    ],
    "topics": [],
    "series": "AI",
    "group": "资料与书单"
  },
  {
    "title": "Ray Core Task 深入",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/02-Task-深入/",
    "summary": "Ray Task 是一次异步 remote function 调用。它适合无状态、可并行、最好幂等的工作。运行时背景见 01 架构与运行时；对象传参规则见 04 Object 与序…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "问答、研究、事实核查与引用设计",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/03-问答研究事实核查与引用设计/",
    "summary": "“请勿幻觉”不是控制措施。可靠性来自可访问检索、来源质量规则、主张级证据映射、冲突处理和无法证实时保留未知。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "Prompt Injection、越权与数据泄露防护",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/工程化与安全/03-Prompt-Injection越权与数据泄露防护/",
    "summary": "Prompt injection 是攻击者通过模型可见内容影响模型决策，使系统偏离开发者意图的攻击类别。",
    "tags": [
      "AI",
      "提示词工程",
      "工程化与安全"
    ],
    "topics": [],
    "series": "AI",
    "group": "工程化与安全"
  },
  {
    "title": "提示词评测与发布模板",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/模板库/03-提示词评测与发布模板/",
    "summary": "- 01 通用任务提示词模板",
    "tags": [
      "AI",
      "提示词工程",
      "模板库"
    ],
    "topics": [],
    "series": "AI",
    "group": "模板库"
  },
  {
    "title": "Zero-shot Few-shot与示例设计",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词教程/03-Zero-shot-Few-shot与示例设计/",
    "summary": "- 区分 Zero-shot 与 Few-shot 提示。",
    "tags": [
      "AI",
      "提示词工程",
      "提示词教程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词教程"
  },
  {
    "title": "评测集、指标、Rubric 与 LLM-as-Judge",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词优化/03-评测集指标Rubric与LLM-as-Judge/",
    "summary": "- 上一章：02 提示词诊断错误分类与最小修改",
    "tags": [
      "AI",
      "提示词工程",
      "提示词优化"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词优化"
  },
  {
    "title": "术语表与技术谱系",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/资料与书单/03-术语表与技术谱系/",
    "summary": "- 01 权威在线资料论文与课程",
    "tags": [
      "AI",
      "提示词工程",
      "资料与书单"
    ],
    "topics": [],
    "series": "AI",
    "group": "资料与书单"
  },
  {
    "title": "Ray Generator",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/03-Ray-Generator/",
    "summary": "Ray Generator 让一个 Task 或 Actor method 在完成前逐项 yield 结果。它解决“结果很多、每项较大、希望边生成边消费”的问题。普通 Task 基…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "编程、代码生成、调试、测试与 Code Review",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/04-编程代码生成调试测试与Code-Review/",
    "summary": "先读仓库再改代码。提示必须明确目标、作用域、运行环境、验证命令和安全边界；默认最小 diff，不执行来源未知的代码、脚本或依赖。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "提示词模板、版本、配置与可观测性",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/工程化与安全/04-提示词模板版本配置与可观测性/",
    "summary": "生产行为由一组耦合配置共同决定，而不只是 prompt 文本：",
    "tags": [
      "AI",
      "提示词工程",
      "工程化与安全"
    ],
    "topics": [],
    "series": "AI",
    "group": "工程化与安全"
  },
  {
    "title": "场景模板速查表",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/模板库/04-场景模板速查表/",
    "summary": "| 场景 | 核心区块 | 必测失败 | 推荐输出 |",
    "tags": [
      "AI",
      "提示词工程",
      "模板库"
    ],
    "topics": [],
    "series": "AI",
    "group": "模板库"
  },
  {
    "title": "输出格式结构化输出与约束生成",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词教程/04-输出格式结构化输出与约束生成/",
    "summary": "- 区分展示格式、语法合法性、schema 合法性和业务正确性。",
    "tags": [
      "AI",
      "提示词工程",
      "提示词教程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词教程"
  },
  {
    "title": "A/B 测试、回归测试与版本管理",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/",
    "summary": "- 上一章：03 评测集指标Rubric与LLM-as-Judge",
    "tags": [
      "AI",
      "提示词工程",
      "提示词优化"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词优化"
  },
  {
    "title": "Ray Core Object 与序列化",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/04-Object-与序列化/",
    "summary": "Ray Task 和 Actor 通过 remote object 交换数据，代码中用 ObjectRef 引用它。理解 ObjectRef 的解引用、immutability、o…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "数据分析、SQL、报表与决策支持",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/05-数据分析SQL报表与决策支持/",
    "summary": "先锁定 schema、SQL dialect、指标口径和数据时间，再写查询。默认 read-only，限制扫描、行数、时间范围和成本，并用独立方法验证结果。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "生产系统设计评审与上线清单",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/工程化与安全/05-生产系统设计评审与上线清单/",
    "summary": "本清单用于评审带有 LLM、RAG、structured output 或工具调用的生产系统。",
    "tags": [
      "AI",
      "提示词工程",
      "工程化与安全"
    ],
    "topics": [],
    "series": "AI",
    "group": "工程化与安全"
  },
  {
    "title": "复杂任务分解推理与提示链",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词教程/05-复杂任务分解推理与提示链/",
    "summary": "- 判断任务何时需要分解。",
    "tags": [
      "AI",
      "提示词工程",
      "提示词教程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词教程"
  },
  {
    "title": "Token 成本、延迟、稳定性与模型选择",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词优化/05-Token成本延迟稳定性与模型选择/",
    "summary": "- 上一章：04 A-B测试回归测试与版本管理",
    "tags": [
      "AI",
      "提示词工程",
      "提示词优化"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词优化"
  },
  {
    "title": "Ray Core：Actor 深入",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/05-Actor-深入/",
    "summary": "Actor 是有状态的远程 worker。调用 ActorClass.remote() 时，Ray 创建一个专属 Python 进程；该进程不被普通 task 复用，方法共享进程内…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "教学辅导、学习计划与知识测验",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/06-教学辅导学习计划与知识测验/",
    "summary": "先诊断先备知识和目标，再决定解释深度。优先提问、提示、局部示范和反馈；对作业与考试不直接代做，并为不同学习需求提供可达路径。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "多轮对话上下文管理与澄清策略",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词教程/06-多轮对话上下文管理与澄清策略/",
    "summary": "- 区分对话历史、业务状态、用户偏好与外部事实。",
    "tags": [
      "AI",
      "提示词工程",
      "提示词教程"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词教程"
  },
  {
    "title": "自动提示词优化与高级方法",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/提示词优化/06-自动提示词优化与高级方法/",
    "summary": "- 上一章：05 Token成本延迟稳定性与模型选择",
    "tags": [
      "AI",
      "提示词工程",
      "提示词优化"
    ],
    "topics": [],
    "series": "AI",
    "group": "提示词优化"
  },
  {
    "title": "Ray Core：资源与调度",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/06-资源与调度/",
    "summary": "Ray 调度分两步理解：资源决定节点是否可行，调度策略在可行节点中决定放到哪里。资源不足是硬约束：有对应总容量但暂时被占用叫 unavailable，会排队；集群中没有任何节点满足…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "图像、多模态与视觉任务提示词",
    "date": "2026.08",
    "path": "/kb/ai/提示词工程/常见场景/07-图像多模态与视觉任务提示词/",
    "summary": "多模态输入要标识每种模态及顺序，引用图像区域、视频时间段和页面位置。OCR 与视觉推断必须保留不确定性；图像生成要分解主体、构图、风格、光照和技术参数，并处理版权与身份风险。",
    "tags": [
      "AI",
      "提示词工程",
      "常见场景"
    ],
    "topics": [],
    "series": "AI",
    "group": "常见场景"
  },
  {
    "title": "Ray Core：Placement Group",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/07-Placement-Group/",
    "summary": "逐个创建 4 个 worker actor 时，前 3 个可能先占住资源，第 4 个永远无法启动，形成资源死锁或半启动服务。PG 先原子地预留全部 bundle：全部能放下才预留，…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "Ray Core：内存与对象溢写",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/08-内存与对象溢写/",
    "summary": "Ray 的“内存”至少包含 worker heap、object store、共享映射和系统进程。排查 OOM 时若只看一个进程的 RSS，很容易重复计算共享内存，或把 heap …",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "Ray Core：容错",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/09-容错/",
    "summary": "容错设计的第一步不是把重试次数调大，而是区分 application-level failure 与 system-level failure，并明确 task、actor、obj…",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "Ray Core Runtime Environment 与命名空间",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/10-Runtime-Environment-与命名空间/",
    "summary": "title: Ray Core Runtime Environment 与命名空间",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "Ray Core 可观测性与调试",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/11-可观测性与调试/",
    "summary": "title: Ray Core 可观测性与调试",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "Ray Core 设计模式与反模式",
    "date": "2026.08",
    "path": "/kb/ai/Ray/Ray-Core/12-设计模式与反模式/",
    "summary": "title: Ray Core 设计模式与反模式",
    "tags": [
      "AI",
      "Ray",
      "Ray Core"
    ],
    "topics": [],
    "series": "AI",
    "group": "Ray Core"
  },
  {
    "title": "Docker 学习路线与文档索引",
    "date": "2026.08",
    "path": "/kb/container/Docker/00-Docker学习路线与文档索引/",
    "summary": "Docker 入门不难，难点通常是把零散命令连成完整知识体系：",
    "tags": [
      "容器",
      "Docker"
    ],
    "topics": [],
    "series": "容器",
    "group": "Docker"
  },
  {
    "title": "镜像体积优化与构建上下文",
    "date": "2026.08",
    "path": "/kb/container/Docker/镜像优化/01-镜像体积优化与构建上下文/",
    "summary": "镜像优化不是单纯追求一个更小的数字。",
    "tags": [
      "容器",
      "Docker",
      "镜像优化"
    ],
    "topics": [],
    "series": "容器",
    "group": "镜像优化"
  },
  {
    "title": "Docker 入门：安装与环境检查",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/01-Docker入门安装与环境检查/",
    "summary": "Docker 最适合解决这样一个问题：同一份应用，如何在开发机、测试机和服务器上获得尽可能一致的运行环境？",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "Docker 整体架构与请求链路",
    "date": "2026.08",
    "path": "/kb/container/Docker/原理分析/01-Docker整体架构与请求链路/",
    "summary": "Docker 不是一个单独的进程。",
    "tags": [
      "容器",
      "Docker",
      "原理分析"
    ],
    "topics": [],
    "series": "容器",
    "group": "原理分析"
  },
  {
    "title": "多阶段构建实战",
    "date": "2026.08",
    "path": "/kb/container/Docker/镜像优化/02-多阶段构建实战/",
    "summary": "应用构建环境和运行环境的需求通常完全不同。",
    "tags": [
      "容器",
      "Docker",
      "镜像优化"
    ],
    "topics": [],
    "series": "容器",
    "group": "镜像优化"
  },
  {
    "title": "镜像与容器常用命令",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/02-镜像与容器常用命令/",
    "summary": "上一篇：01 Docker入门安装与环境检查",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "镜像分层、容器可写层与 OCI",
    "date": "2026.08",
    "path": "/kb/container/Docker/原理分析/02-镜像分层容器可写层与OCI/",
    "summary": "Docker 镜像不是一个完整磁盘文件的简单副本。",
    "tags": [
      "容器",
      "Docker",
      "原理分析"
    ],
    "topics": [],
    "series": "容器",
    "group": "原理分析"
  },
  {
    "title": "BuildKit 缓存挂载与构建加速",
    "date": "2026.08",
    "path": "/kb/container/Docker/镜像优化/03-BuildKit缓存挂载与构建加速/",
    "summary": "构建加速不是简单地“开启缓存”。",
    "tags": [
      "容器",
      "Docker",
      "镜像优化"
    ],
    "topics": [],
    "series": "容器",
    "group": "镜像优化"
  },
  {
    "title": "端口、网络与容器通信",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/03-端口网络与容器通信/",
    "summary": "上一篇：02 镜像与容器常用命令",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "Namespace、Cgroups 与容器隔离",
    "date": "2026.08",
    "path": "/kb/container/Docker/原理分析/03-Namespace-Cgroups与容器隔离/",
    "summary": "Linux 容器隔离由多种内核机制共同构成。",
    "tags": [
      "容器",
      "Docker",
      "原理分析"
    ],
    "topics": [],
    "series": "容器",
    "group": "原理分析"
  },
  {
    "title": "多平台镜像与 Buildx",
    "date": "2026.08",
    "path": "/kb/container/Docker/镜像优化/04-多平台镜像与Buildx/",
    "summary": "同一个镜像名称可以支持多个操作系统和 CPU 架构。",
    "tags": [
      "容器",
      "Docker",
      "镜像优化"
    ],
    "topics": [],
    "series": "容器",
    "group": "镜像优化"
  },
  {
    "title": "数据卷与持久化",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/04-数据卷与持久化/",
    "summary": "上一篇：03 端口网络与容器通信",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "Docker 网络原理",
    "date": "2026.08",
    "path": "/kb/container/Docker/原理分析/04-Docker网络原理/",
    "summary": "原生 Linux 上，默认 bridge 网络的常见数据路径如下：",
    "tags": [
      "容器",
      "Docker",
      "原理分析"
    ],
    "topics": [],
    "series": "容器",
    "group": "原理分析"
  },
  {
    "title": "镜像安全供应链与生产检查清单",
    "date": "2026.08",
    "path": "/kb/container/Docker/镜像优化/05-镜像安全供应链与生产检查清单/",
    "summary": "镜像安全不是发布前执行一次漏洞扫描。",
    "tags": [
      "容器",
      "Docker",
      "镜像优化"
    ],
    "topics": [],
    "series": "容器",
    "group": "镜像优化"
  },
  {
    "title": "Dockerfile 从零构建镜像",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/05-Dockerfile从零构建镜像/",
    "summary": "上一篇：04 数据卷与持久化",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "Docker 存储与挂载原理",
    "date": "2026.08",
    "path": "/kb/container/Docker/原理分析/05-Docker存储与挂载原理/",
    "summary": "理解 Docker 存储，先不要把所有“容器里的文件”混成一类。",
    "tags": [
      "容器",
      "Docker",
      "原理分析"
    ],
    "topics": [],
    "series": "容器",
    "group": "原理分析"
  },
  {
    "title": "Docker Compose 多容器应用",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/06-Docker-Compose多容器应用/",
    "summary": "上一篇：05 Dockerfile从零构建镜像",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "BuildKit 构建、缓存与镜像分发",
    "date": "2026.08",
    "path": "/kb/container/Docker/原理分析/06-BuildKit构建缓存与镜像分发/",
    "summary": "BuildKit 是现代 Docker 构建后端。",
    "tags": [
      "容器",
      "Docker",
      "原理分析"
    ],
    "topics": [],
    "series": "容器",
    "group": "原理分析"
  },
  {
    "title": "日志、调试、资源限制与安全实践",
    "date": "2026.08",
    "path": "/kb/container/Docker/使用教程/07-日志调试资源限制与安全实践/",
    "summary": "上一篇：06 Docker Compose多容器应用",
    "tags": [
      "容器",
      "Docker",
      "使用教程"
    ],
    "topics": [],
    "series": "容器",
    "group": "使用教程"
  },
  {
    "title": "标注工具平台设计方案",
    "date": "2026.08",
    "path": "/kb/projects/标注工具平台/01-标注工具平台设计方案/",
    "summary": "平台需要把「原始数据 → 标准数据集」的整条链路做成可管理、可追溯、可回流的闭环，而不只是一个画框子的网页。",
    "tags": [
      "项目整理",
      "标注工具平台"
    ],
    "topics": [],
    "series": "项目整理",
    "group": "标注工具平台"
  },
  {
    "title": "基于 Obsidian 的多模态教学视频生成方案",
    "date": "2026.08",
    "path": "/kb/projects/墨影/01-基于Obsidian的多模态教学视频生成方案/",
    "summary": "系统需要把 Obsidian 中一篇或一组结构化笔记转换为可审核、可编辑、可增量重建的教学视频，同时将成片、字幕、讲稿、分镜、板书和质量报告回写到 vault。",
    "tags": [
      "项目整理",
      "墨影"
    ],
    "topics": [],
    "series": "项目整理",
    "group": "墨影"
  },
  {
    "title": "教学视频板书实现方案",
    "date": "2026.08",
    "path": "/kb/projects/墨影/02-教学视频板书实现方案/",
    "summary": "教学板书并不只是模仿手写字体。高质量板书必须同时满足：",
    "tags": [
      "项目整理",
      "墨影"
    ],
    "topics": [],
    "series": "项目整理",
    "group": "墨影"
  }
] as const
