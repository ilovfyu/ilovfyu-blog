<script setup lang="ts">
import { ArrowUpRight, BookOpen, FolderTree, Hash, RotateCcw, X } from '@lucide/vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

type Article = {
  title: string
  date: string
  status?: string
  path: string
  summary: string
  tags: string[]
  topics: string[]
}

const topicGroups = [
  { id: 'ai', code: '01', name: 'AI', tags: ['AI', 'Agent', 'ClaudeCode', 'CodeX', 'Coze', 'Dask', 'DeepSeek', 'Harness', 'LangChain', 'LangGraph', 'Loop', 'Mcp', 'NLP', 'Pytorch', 'Qwen', 'RAG', 'Ray', 'SKLearn', 'Skills', 'Spark', 'Tensorflow', 'comfyUI', '原生工作流引擎', '多Agent协作', '多模态', '大模型', '大模型原理', '小模型', '工作流', '强化学习', '微调', '提示词工程', '智能体框架', '机器学习', '深度学习', '百炼', '记忆工程', 'PAI', 'Ray Core', '提示词教程', '提示词优化', '常见场景', '模板库', '工程化与安全', '资料与书单'] },
  { id: 'language', code: '02', name: 'Language', tags: ['Language', 'Go', 'JavaScript', 'Lua', 'Python', 'TypeScript', '核心语法', '语法教程', '异步处理', '服务框架', 'FastAPI', '版本特性'] },
  { id: 'middleware', code: '03', name: '中间件', tags: ['RPC', '任务调度', '向量', '安全认证', '对象存储', '搜索', '数据库', '数据集成', '服务发现', '服务网格', '模型训练', '流处理', '消息队列', '监控日志链路', '缓存', '网关', '负载均衡', '配置中心', '限流熔断降级'] },
  { id: 'frontend', code: '04', name: '前端', tags: ['NextJS', 'NuxtJS', 'React', 'Vite', 'Vue'] },
  { id: 'big-data', code: '05', name: '大数据', tags: ['实时数仓', '数据建模', '离线数仓', '组件'] },
  { id: 'container', code: '06', name: '容器', tags: ['容器', 'Docker', 'Kubernetes', '使用教程', '原理分析', '镜像优化'] },
  { id: 'recommendation', code: '07', name: '推荐系统', tags: ['漏斗架构', '特征工程', '算法模型', '评估指标'] },
  { id: 'architecture', code: '08', name: '架构', tags: ['Serverless', '云原生', '分布式', '微服务', '高可用', '高并发'] },
  { id: 'deployment', code: '09', name: '部署', tags: ['FastAPI-Cloud', 'Railway', 'Render', 'Vercel', 'Zeabur'] },
  { id: 'aliyun', code: '10', name: '阿里云', tags: ['ACK', '中间件', '函数计算', '大数据', '存储', '数据库', '服务器', '网络'] },
]

const articles: Article[] = [
  {
    title: '从 Demo 到生产：构建可靠 RAG 系统的六个层次',
    date: '2026.08.01',
    path: '/posts/production-rag/',
    summary: '把 RAG 拆成数据生命周期、解析、检索、上下文、评测与安全治理六条可观测链路。',
    tags: ['AI', 'RAG', 'LLM'],
    topics: ['大模型', '大模型原理', '向量', '搜索'],
  },
  {
    title: 'AI Agent 工程化：状态、工具调用与可观测性',
    date: '2026.07.24',
    path: '/posts/agent-runtime/',
    summary: '从状态机、工具契约、权限与 Trace 出发，构建可恢复、可解释的 Agent Runtime。',
    tags: ['AI', 'Agent', 'Engineering'],
    topics: ['大模型', '工作流', '智能体框架', '微服务', '监控日志链路'],
  },
  {
    title: 'Vue 3 高性能交互：建立 16ms 渲染预算',
    date: '2026.07.12',
    path: '/posts/vue-render-budget/',
    summary: '定位脚本、布局与绘制开销，缩小响应式更新面，并拆分低优先级工作。',
    tags: ['Vue', 'Performance', 'Frontend'],
    topics: ['前端', 'Vue'],
  },
  {
    title: 'TypeScript 项目中真正值得设计的类型边界',
    date: '2026.06.28',
    path: '/posts/typescript-boundaries/',
    summary: '用 unknown、解析层和领域模型，阻止不可信数据从系统边界向内部扩散。',
    tags: ['TypeScript', 'Architecture', 'Engineering'],
    topics: ['前端', 'TypeScript', '架构'],
  },
  {
    title: '从 Core Web Vitals 到真实用户监控',
    date: '2026.06.15',
    path: '/posts/frontend-observability/',
    summary: '建立能关联版本、路由和发布事件的真实用户观测闭环。',
    tags: ['Frontend', 'Observability', 'Performance'],
    topics: ['前端', '监控日志链路'],
  },
  {
    title: '不靠感觉调 Prompt：建立可重复的评测集',
    date: '2026.05.30',
    path: '/posts/prompt-evaluation/',
    summary: '固定输入、质量标准和回归切片，让每次 Prompt 与模型变更都可以被比较。',
    tags: ['AI', 'Evaluation', 'Prompt'],
    topics: ['大模型', '提示词工程', '评估指标'],
  },
  {
    title: '当屏幕消失之后，我们还剩下什么？',
    date: '2024.07.18',
    path: '/posts/screenless-era/',
    summary: '当技术退到环境之后，重新思考界面、注意力与人的主动选择。',
    tags: ['思考', 'Future'],
    topics: [],
  },
  {
    title: '把想法变成现实的 7 个夜晚',
    date: '2024.07.02',
    path: '/posts/seven-nights/',
    summary: '一个独立产品从零到一的记录，关于原型、取舍和真实反馈。',
    tags: ['构建', 'Product'],
    topics: [],
  },
  {
    title: '在城市边缘，寻找一点留白',
    date: '2024.06.21',
    path: '/posts/edge-of-city/',
    summary: '暂时离开通知和信息流，让注意力重新恢复完整。',
    tags: ['生活', 'Life'],
    topics: [],
  },
]

import { knowledgeArticles } from '../data/knowledgeArticles'

const knowledgeNotes: Article[] = knowledgeArticles.map((article) => ({
  title: article.title,
  date: article.date || '',
  status: `${article.series} · ${article.group}`,
  path: article.path,
  summary: article.summary,
  tags: article.tags,
  topics: article.topics,
}))

// 手工精选文章在前，同步的知识库笔记在后
const allArticles: Article[] = [...articles, ...knowledgeNotes]

// 系列筛选：手工文章归入「随笔」，知识笔记按 series 分组（项目内容由「项目」tab 专门承载）
const seriesOptions = [
  { key: 'all', label: '全部' },
  { key: 'posts', label: '随笔' },
  { key: 'OS', label: 'OS' },
  { key: 'Language', label: 'Language' },
  { key: 'AI', label: 'AI' },
  { key: '容器', label: '容器' },
]

function articleSeries(article: Article) {
  if (article.path.startsWith('/posts/')) return 'posts'
  return article.series ?? ''
}

const activeSeries = ref('all')
const pageSize = 30
const currentPage = ref(1)

const activeTags = ref<string[]>([])
const resultSection = ref<HTMLElement | null>(null)
const topicCount = topicGroups.reduce((count, group) => count + group.tags.length, 0)
const publishedTags = [...new Set(allArticles.flatMap((article) => article.tags))]

function matchesTag(article: Article, tag: string) {
  const normalized = tag.toLocaleLowerCase()
  return [...article.tags, ...article.topics].some((item) => item.toLocaleLowerCase() === normalized)
}

const filteredArticles = computed(() => {
  let list = allArticles
  if (activeSeries.value !== 'all') {
    list = list.filter((article) => articleSeries(article) === activeSeries.value)
  }
  if (activeTags.value.length) {
    list = list.filter((article) => activeTags.value.every((tag) => matchesTag(article, tag)))
  }
  // 按日期倒序（最新在前），无日期的排末尾
  return [...list].sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
})

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredArticles.value.slice(start, start + pageSize)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredArticles.value.length / pageSize)))

function selectSeries(key: string) {
  activeSeries.value = key
  currentPage.value = 1
}

function goPage(page: number) {
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
}

function countArticles(tag: string) {
  const tags = isSelected(tag) ? activeTags.value : [...activeTags.value, tag]
  return allArticles.filter((article) => tags.every((item) => matchesTag(article, item))).length
}

function isSelected(tag: string) {
  return activeTags.value.includes(tag)
}

function updateUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('tag')
  activeTags.value.forEach((tag) => url.searchParams.append('tag', tag))
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

async function selectTag(tag: string, revealResults = false) {
  activeTags.value = isSelected(tag)
    ? activeTags.value.filter((item) => item !== tag)
    : [...activeTags.value, tag]
  currentPage.value = 1
  updateUrl()
  if (revealResults && window.innerWidth < 900) {
    await nextTick()
    resultSection.value?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }
}

function clearFilter() {
  activeTags.value = []
  currentPage.value = 1
  updateUrl()
}

onMounted(() => {
  const tags = new URLSearchParams(window.location.search).getAll('tag').filter(Boolean)
  activeTags.value = [...new Set(tags)]
})
</script>

<template>
  <main class="knowledge-page">
    <div class="knowledge-fx" aria-hidden="true">
      <i class="knowledge-fx-beam" />
      <i class="knowledge-fx-glow knowledge-fx-glow-a" />
      <i class="knowledge-fx-glow knowledge-fx-glow-b" />
    </div>
    <section class="knowledge-hero">
      <div class="knowledge-hero-grid" aria-hidden="true" />
      <div class="knowledge-orbit" aria-hidden="true">
        <i class="knowledge-orbit-ring knowledge-orbit-ring-a" />
        <i class="knowledge-orbit-ring knowledge-orbit-ring-b" />
        <span><b /><b /><b /></span>
        <p><i /> INDEX CORE <strong>ONLINE</strong></p>
      </div>
      <div class="knowledge-hero-inner">
        <p class="knowledge-kicker"><FolderTree /> KNOWLEDGE SYSTEM / INDEX</p>
        <h1>知识库</h1>
        <p>按 ilovfyu-final 知识库目录组织标签，浏览概念整理、工程实践与已发布随笔。</p>
        <div class="knowledge-search">
          <SearchBox />
        </div>
        <dl>
          <div><dt>TOPIC GROUPS</dt><dd>{{ topicGroups.length }}</dd></div>
          <div><dt>INDEXED TAGS</dt><dd>{{ topicCount }}</dd></div>
          <div><dt>PUBLISHED</dt><dd>{{ allArticles.length }}</dd></div>
        </dl>
      </div>
    </section>

    <div class="knowledge-layout">
      <aside class="knowledge-taxonomy" aria-label="知识库标签">
        <header>
          <div><p>// TOPIC INDEX</p><h2>技术主题</h2></div>
          <button type="button" :class="{ active: !activeTags.length }" :aria-pressed="!activeTags.length" @click="clearFilter">
            全部 <span>{{ allArticles.length }}</span>
          </button>
        </header>

        <section v-for="group in topicGroups" :id="group.id" :key="group.id" class="knowledge-group">
          <div class="knowledge-group-title"><span>{{ group.code }}</span><h3>{{ group.name }}</h3></div>
          <div class="knowledge-tags">
            <button
              v-for="tag in group.tags"
              :key="tag"
              type="button"
              :class="{ active: isSelected(tag), empty: countArticles(tag) === 0 }"
              :aria-pressed="isSelected(tag)"
              @click="selectTag(tag, true)"
            >
              #{{ tag }} <sup>{{ countArticles(tag) }}</sup>
            </button>
          </div>
        </section>
      </aside>

      <section ref="resultSection" class="knowledge-results">
        <header class="knowledge-results-head">
          <div>
            <p>// PUBLISHED NOTES</p>
            <h2>{{ activeTags.length ? '标签交集' : (activeSeries === 'all' ? '全部文章' : (seriesOptions.find((s) => s.key === activeSeries)?.label ?? '全部文章')) }}</h2>
          </div>
          <div class="knowledge-result-state" aria-live="polite">
            <span>{{ filteredArticles.length }} 篇文章</span>
            <button v-if="activeTags.length" type="button" title="清除标签筛选" @click="clearFilter"><RotateCcw /> 清除筛选</button>
          </div>
        </header>

        <nav class="knowledge-series" aria-label="按系列筛选">
          <button
            v-for="option in seriesOptions"
            :key="option.key"
            type="button"
            :class="{ active: activeSeries === option.key }"
            :aria-pressed="activeSeries === option.key"
            @click="selectSeries(option.key)"
          >
            {{ option.label }}
          </button>
        </nav>

        <div v-if="activeTags.length" class="knowledge-active-tags" aria-label="已选择的标签">
          <span>同时匹配</span>
          <button v-for="tag in activeTags" :key="tag" type="button" :title="`移除 ${tag}`" @click="selectTag(tag)">
            #{{ tag }} <X />
          </button>
        </div>

        <div v-if="paginatedArticles.length" class="knowledge-article-list">
          <article v-for="(article, index) in paginatedArticles" :key="article.path" class="knowledge-article">
            <span class="knowledge-article-index">{{ String((currentPage - 1) * pageSize + index + 1).padStart(2, '0') }}</span>
            <div class="knowledge-article-copy">
              <time>{{ article.date }}<template v-if="article.status"> · {{ article.status }}</template></time>
              <a :href="withBase(article.path)"><h3>{{ article.title }}</h3><ArrowUpRight /></a>
              <p>{{ article.summary }}</p>
              <div class="knowledge-article-tags" aria-label="文章标签">
                <button
                  v-for="tag in article.tags"
                  :key="tag"
                  type="button"
                  :class="{ active: isSelected(tag) }"
                  :aria-pressed="isSelected(tag)"
                  @click="selectTag(tag)"
                >
                  #{{ tag }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="knowledge-empty" role="status">
          <Hash />
          <h3>没有同时匹配这些标签的文章</h3>
          <p>可以移除部分标签，或者查看全部已发布文章。</p>
          <button type="button" @click="clearFilter"><BookOpen /> 查看全部文章</button>
        </div>

        <nav v-if="totalPages > 1" class="knowledge-pagination" aria-label="分页">
          <button type="button" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">‹ 上一页</button>
          <span>{{ currentPage }} / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">下一页 ›</button>
        </nav>

        <footer class="knowledge-published-tags">
          <span>已发布标签</span>
          <button
            v-for="tag in publishedTags"
            :key="tag"
            type="button"
            :class="{ active: isSelected(tag) }"
            :aria-pressed="isSelected(tag)"
            @click="selectTag(tag)"
          >
            #{{ tag }}
          </button>
        </footer>
      </section>
    </div>
  </main>
</template>
