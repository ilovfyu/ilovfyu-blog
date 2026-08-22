<script setup lang="ts">
import { ArrowUpRight, Braces, CircleDot, CodeXml, Cpu, GitFork, Ruler } from '@lucide/vue'
import { computed, ref } from 'vue'
import { withBase } from 'vuepress/client'

type TopicKey = 'math' | 'algorithm' | 'os' | 'network'

type TopicModule = {
  code: string
  title: string
  summary: string
  count: number
  status: string
  lessons: string[]
}

type Topic = {
  key: TopicKey
  code: string
  index: string
  name: string
  english: string
  summary: string
  icon: typeof Ruler
  status: string
  total: number
  modules: TopicModule[]
}

const topics: Topic[] = [
  {
    key: 'math',
    code: 'MTH',
    index: '01',
    name: '数学基础',
    english: 'MATHEMATICAL FOUNDATIONS',
    summary: '把概率、空间、变换与不确定性整理成能够支撑机器学习和工程判断的基础语言。',
    icon: Ruler,
    status: 'ACTIVE / 65 NOTES',
    total: 65,
    modules: [],
  },
  {
    key: 'algorithm',
    code: 'ALG',
    index: '02',
    name: '算法',
    english: 'ALGORITHMIC THINKING',
    summary: '从数据结构出发，沿着问题建模、搜索空间和复杂度控制建立解题路径。',
    icon: Braces,
    status: 'SCAFFOLD / 09 MODULES',
    total: 0,
    modules: [
      { code: 'A.01', title: '线性结构', summary: '数组、链表与字符串，先把数据的形状和访问方式说清楚。', count: 0, status: 'PLANNED', lessons: ['数组与双指针', '链表与快慢指针', '字符串与窗口'] },
      { code: 'A.02', title: '树与层级结构', summary: '从递归、遍历到索引结构，处理带有层级关系的数据。', count: 0, status: 'PLANNED', lessons: ['树的遍历', '二叉搜索树', '堆与优先队列'] },
      { code: 'A.03', title: '搜索与剪枝', summary: '管理状态空间，让暴力搜索在约束条件下变成可行方案。', count: 0, status: 'PLANNED', lessons: ['深度优先搜索', '广度优先搜索', '回溯与剪枝'] },
      { code: 'A.04', title: '二分与贪心', summary: '识别单调性和局部最优结构，缩小决策的复杂度。', count: 0, status: 'PLANNED', lessons: ['二分答案', '区间与边界', '贪心策略与反例'] },
      { code: 'A.05', title: '动态规划', summary: '用状态、转移和边界把重复子问题变成可验证的模型。', count: 0, status: 'PLANNED', lessons: ['状态设计', '背包与序列', '区间与树形 DP'] },
      { code: 'A.06', title: '图论与大数', summary: '处理关系网络、路径和超出常规数值范围的计算问题。', count: 0, status: 'PLANNED', lessons: ['最短路与连通性', '拓扑与网络流', '大数表示与运算'] },
    ],
  },
  {
    key: 'os',
    code: 'SYS',
    index: '03',
    name: 'OS',
    english: 'OPERATING SYSTEMS',
    summary: '沿着资源、并发、存储与故障现场理解操作系统，而不是只记抽象概念。',
    icon: Cpu,
    status: 'ACTIVE / 113 NOTES',
    total: 113,
    modules: [
      { code: 'O.01', title: '进程与线程', summary: '理解执行单元、调度和上下文切换，建立并发程序的运行模型。', count: 7, status: 'READY', lessons: ['进程概念与状态模型', '进程控制块与系统调用', '进程切换与调度行为', '线程概念与多线程模型', 'CPU调度算法详解', '多处理器调度与实时调度'] },
      { code: 'O.02', title: '同步与死锁', summary: '从共享状态出发，解释锁、等待和系统为什么会停在原地。', count: 11, status: 'READY', lessons: ['临界区问题与互斥实现', '信号量与同步原语', '管程与条件变量', '经典同步问题详解', '现代同步原语与无锁编程', '死锁特征与必要条件', '资源分配图与死锁建模', '死锁预防', '死锁避免与银行家算法', '死锁实战与内核实现'] },
      { code: 'O.03', title: '内存', summary: '从虚拟地址到页面置换，串起隔离、映射和性能之间的关系。', count: 7, status: 'READY', lessons: ['内存管理基础与连续分配', '分页与页表结构', '分段与段页式', '虚拟内存与按需分页', '页面置换算法', '内存性能与系统调优'] },
      { code: 'O.04', title: '存储与文件系统', summary: '追踪数据穿过磁盘、文件系统与日志的持久化路径。', count: 7, status: 'READY', lessons: ['磁盘结构与大容量存储', '磁盘调度算法与RAID', '文件系统接口与目录结构', '文件系统实现', '文件系统性能与空间管理', '文件系统可靠性与日志'] },
      { code: 'O.05', title: 'IO 子系统', summary: '理解设备控制、中断 DMA 与内核缓冲如何把数据送进内存。', count: 6, status: 'READY', lessons: ['IO硬件与设备控制', 'IO控制方式与中断DMA', '内核IO子系统与缓冲', '设备驱动与设备管理', 'IO路径与性能优化'] },
      { code: 'O.06', title: '安全与保护', summary: '从访问控制、身份认证到防御审计，建立系统的安全边界。', count: 6, status: 'READY', lessons: ['保护机制与访问控制', '身份认证与密码学基础', '系统安全威胁与攻击', '恶意软件与网络攻击', '安全防御与审计'] },
      { code: 'O.07', title: 'Linux 实操与内核', summary: '把系统知识落到命令、指标与内核实现，能观察也能定位。', count: 16, status: 'READY', lessons: ['Linux进程与调度实操', 'Linux内存管理实操', 'Linux文件系统与磁盘实操', 'LinuxIO与性能监控实操', 'Linux网络与系统调用实操', 'Linux安全权限与审计', 'Linux内核架构与启动原理', 'Linux进程与线程内核原理', 'Linux调度器原理', 'Linux内存管理内核原理', 'Linux文件系统内核原理', 'LinuxIO栈内核原理', 'Linux网络栈内核原理', 'Linux安全机制内核原理', '文件描述符详解'] },
      { code: 'O.08', title: 'Bash 命令', summary: '以命令为入口系统掌握文件、文本、进程、网络与脚本。', count: 22, status: 'READY', lessons: ['核心命令与文件操作', '文本处理三剑客', '进程与作业控制', '权限与用户管理', '磁盘与文件系统命令', '网络命令', '系统监控与性能命令', 'Shell脚本编程进阶', '高级命令与文本处理', '实用命令组合与技巧', '远程操作与文件同步', '服务管理与定时任务', '调试与追踪工具', '包管理与软件安装', '防火墙与网络安全命令', '二进制与安全审计命令', '内核模块硬件与系统参数命令', '结构化数据处理命令', '时间终端与环境管理命令', '现代高效命令行工具', 'Linux命令场景与字母索引'] },
      { code: 'O.09', title: 'GPU 计算', summary: '从硬件架构、CUDA 编程到显存、容器与故障排查，掌握 GPU 系统全栈。', count: 16, status: 'READY', lessons: ['GPU硬件架构与工作原理', 'GPU内存体系与访存原理', 'GPU执行模型与线程调度', 'CUDA编程模型与开发入门', 'CUDA优化技术与性能调优', 'GPU驱动与CUDA运行时栈', 'GPU内存管理与显存分配', 'GPU上下文与多进程调度', 'GPU虚拟化与MIG技术', 'GPU容器化与Kubernetes调度', 'GPU监控与运维实践', 'GPU性能分析与Profiling工具', '大模型训练推理GPU实践', 'GPU故障排查与问题定位', '国产GPU与异构计算生态'] },
      { code: 'O.10', title: '问题排查', summary: '用方法论和真实案例，把系统故障按流程定位到根因。', count: 13, status: 'READY', lessons: ['性能分析方法论', 'CPU性能问题排查', '内存与内存泄漏排查', '磁盘与IO瓶颈排查', '并发与异常排查', '系统启动与内核崩溃', '进程与调度异常疑难', '虚拟内存与交换疑难', '文件系统与磁盘故障', '系统调用与错误码疑难', '内核同步与锁疑难', '疑难案例集锦'] },
    ],
  },
  {
    key: 'network',
    code: 'NET',
    index: '04',
    name: '网络',
    english: 'NETWORK SYSTEMS',
    summary: '从一次请求的完整链路出发，理解协议、传输、解析、均衡与安全。',
    icon: GitFork,
    status: 'SCAFFOLD / 07 MODULES',
    total: 0,
    modules: [
      { code: 'N.01', title: '协议与应用层', summary: '从 HTTP、TLS 到服务协议，理解应用如何表达一次请求。', count: 0, status: 'PLANNED', lessons: ['协议分层', 'HTTP 与 TLS', '服务间协议'] },
      { code: 'N.02', title: '传输层', summary: '围绕连接、可靠性、拥塞与时延分析数据如何抵达。', count: 0, status: 'PLANNED', lessons: ['TCP 连接', '可靠传输', '拥塞与重传'] },
      { code: 'N.03', title: 'DNS 与负载均衡', summary: '解析一个域名背后的命名、发现、路由和流量分配。', count: 0, status: 'PLANNED', lessons: ['DNS 解析链路', 'LB 与健康检查', '服务发现'] },
      { code: 'N.04', title: '拨测与可观测性', summary: '用探针、日志和指标定位链路中真正变慢或失败的节点。', count: 0, status: 'PLANNED', lessons: ['拨测模型', '网络指标', '链路故障定位'] },
      { code: 'N.05', title: '攻防', summary: '以边界和威胁模型为起点，理解网络系统的防护与验证。', count: 0, status: 'PLANNED', lessons: ['攻击面', '身份与访问控制', '防护验证'] },
    ],
  },
]

const props = defineProps<{ topic?: TopicKey }>()
const isOverview = computed(() => !props.topic)
const currentTopic = computed(() => topics.find((item) => item.key === props.topic) ?? topics[0])
const activeModuleIndex = ref(0)
const activeLessonIndex = ref(0)
const activeModule = computed(() => currentTopic.value.modules[activeModuleIndex.value] ?? currentTopic.value.modules[0])
const activeLesson = computed(() => activeModule.value?.lessons[activeLessonIndex.value] ?? '')

function selectModule(index: number) {
  activeModuleIndex.value = index
  activeLessonIndex.value = 0
}

function selectLesson(index: number) {
  activeLessonIndex.value = index
}

function topicPath(key: TopicKey) {
  return withBase(`/specials/${key}/`)
}
</script>

<template>
  <main class="topic-hub" :class="`topic-${currentTopic.key}`">
    <div class="topic-atmosphere" aria-hidden="true"><i /><i /><i /></div>

    <section class="topic-hero">
      <div class="topic-hero-inner">
        <p class="topic-kicker"><CircleDot /> FOCUSED STUDY TRACKS / 2026</p>
        <h1>{{ isOverview ? '专题' : currentTopic.name }}</h1>
        <p class="topic-hero-code">{{ isOverview ? 'FOCUSED STUDY TRACKS' : currentTopic.english }}</p>
        <p class="topic-hero-summary">
          {{ isOverview ? '围绕一类基础问题建立连续课程，保留明确的章节依赖、学习顺序和完成状态。' : currentTopic.summary }}
        </p>
        <div class="topic-hero-actions">
          <a v-if="isOverview" :href="withBase('/specials/math/')"><Ruler /> 开始数学基础 <ArrowUpRight /></a>
          <a v-if="!isOverview" :href="withBase('/specials/')"><CodeXml /> 返回专题总览</a>
        </div>
      </div>
      <div class="topic-hero-readout" aria-hidden="true">
        <span>{{ isOverview ? 'TRACK SELECTOR' : currentTopic.code }}</span>
        <strong>{{ isOverview ? '04' : currentTopic.index }}</strong>
        <i />
        <small>{{ isOverview ? 'FOCUS / READY' : currentTopic.status }}</small>
      </div>
    </section>

    <nav class="topic-switcher" aria-label="专题入口">
      <a :href="withBase('/specials/')" :class="{ active: isOverview }">
        <span>00</span><strong>专题总览</strong><small>INDEX</small>
      </a>
      <a v-for="item in topics" :key="item.key" :href="topicPath(item.key)" :class="{ active: !isOverview && currentTopic.key === item.key }">
        <span>{{ item.index }}</span><strong>{{ item.name }}</strong><small>{{ item.code }}</small>
      </a>
    </nav>

    <section v-if="isOverview" class="topic-overview">
      <header class="topic-section-head">
        <div><p>// SELECT A TRACK</p><h2>把一条线走深</h2></div>
        <span>四个专题，四种理解系统的入口</span>
      </header>
      <div class="topic-overview-list">
        <a v-for="item in topics" :key="item.key" class="topic-overview-row" :class="`topic-overview-${item.key}`" :href="topicPath(item.key)">
          <span class="topic-overview-index">{{ item.index }}</span>
          <component :is="item.icon" />
          <div><p>{{ item.code }} / {{ item.english }}</p><h3>{{ item.name }}</h3><span>{{ item.summary }}</span></div>
          <aside><strong>{{ item.total || item.modules.length }}</strong><small>{{ item.total ? 'NOTES' : 'MODULES' }}</small></aside>
          <ArrowUpRight />
        </a>
      </div>
      <div class="topic-overview-note"><span><CircleDot /> RELEASE STATUS</span><p>数学基础已开放概率论、线性代数、考研线性代数与高等数学四条轨道，共 65 篇正文；OS 已按 11 个模块收录 113 篇笔记，含 GPU 计算专项；其余专题按目录推进。</p></div>
    </section>

    <section v-else class="topic-workspace">
      <header class="topic-section-head">
        <div><p>// {{ currentTopic.code }} / CURRICULUM MAP</p><h2>学习轨道</h2></div>
        <span>{{ currentTopic.modules.length }} 个模块 · {{ currentTopic.total || '内容待发布' }} {{ currentTopic.total ? '篇笔记' : '' }}</span>
      </header>

      <div class="topic-workspace-grid">
        <div class="topic-module-map">
          <button v-for="(module, index) in currentTopic.modules" :key="module.code" type="button" class="topic-module" :class="{ active: activeModuleIndex === index }" :aria-pressed="activeModuleIndex === index" @click="selectModule(index)">
            <span class="topic-module-code">{{ module.code }}</span>
            <span class="topic-module-main"><strong>{{ module.title }}</strong><small>{{ module.summary }}</small></span>
            <span class="topic-module-meta"><b>{{ String(module.count).padStart(2, '0') }}</b><small>{{ module.status }}</small></span>
          </button>
        </div>

        <aside class="topic-inspector" aria-live="polite">
          <div class="topic-inspector-head"><span>{{ activeModule.code }} / MODULE INSPECTOR</span><component :is="currentTopic.icon" /></div>
          <h3>{{ activeModule.title }}</h3>
          <p>{{ activeModule.summary }}</p>
          <div class="topic-inspector-line"><span>内容状态</span><strong>{{ activeModule.count ? '已整理' : '待同步' }}</strong></div>
          <div class="topic-lesson-list">
            <button v-for="(lesson, index) in activeModule.lessons" :key="lesson" type="button" :class="{ active: activeLessonIndex === index }" @click="selectLesson(index)">
              <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ lesson }}</strong><i>{{ activeLessonIndex === index ? 'SELECTED' : 'OPEN' }}</i>
            </button>
          </div>
          <div class="topic-lesson-preview"><span>NOW INSPECTING</span><strong>{{ activeLesson }}</strong><small>{{ activeModule.count ? '原始笔记已进入整理队列，网站正文将按模块逐步开放。' : '该模块已经建立目录，正文发布后会沿当前轨道接入。' }}</small></div>
        </aside>
      </div>
    </section>
  </main>
</template>
