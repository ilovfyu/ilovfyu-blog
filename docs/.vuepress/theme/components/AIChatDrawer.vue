<script setup lang="ts">
import { ArrowUp, ArrowUpRight, BookOpen, LoaderCircle, RotateCcw, Sparkles, Square, X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { withBase } from 'vuepress/client'
import { endpoint } from '@temp/assistant-config'
import { assistantOpen, assistantOpener } from '../utils/assistant-state'
import { askKnowledgeAssistant } from '../utils/assistant-client'
import { localKnowledgeReply, retrieveKnowledge, type ChatTurn, type KnowledgeChunk } from '../utils/assistant-knowledge'
import AIAnswerText from './AIAnswerText.vue'
import { useSceneMotion } from '../utils/use-scene-motion'

type Message = ChatTurn & { id: number; sources?: KnowledgeChunk[]; kind?: 'local' | 'ai'; error?: string }
const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const conversation = ref<HTMLElement | null>(null)
const motionRunning = useSceneMotion(conversation)
const question = ref('')
const messages = ref<Message[]>([])
const pending = ref(false)
const loadingKnowledge = ref(false)
const chunks = ref<KnowledgeChunk[]>([])
const indexError = ref('')
const availableArticles = computed(() => new Set(chunks.value.filter(chunk => chunk.ready).map(chunk => chunk.path)).size)
const suggestions = ['Python 3.14 有哪些新特性？', 'Python 的 GIL 是什么？', '知识库有哪些线性代数笔记？']
let loaded = false
let counter = 0
let controller: AbortController | null = null
let previousOverflow = ''

async function loadKnowledge() {
  if (loaded) return
  loadingKnowledge.value = true
  indexError.value = ''
  try { chunks.value = (await import('@temp/assistant-knowledge')).chunks; loaded = true }
  catch { indexError.value = '知识库索引暂时未能加载，请关闭抽屉后重试。' }
  finally { loadingKnowledge.value = false }
}
function stop() { controller?.abort(); controller = null }
function close() { assistantOpen.value = false }
function clear() { stop(); messages.value = []; question.value = ''; input.value?.focus() }
async function scrollToLatest() { await nextTick(); conversation.value?.scrollTo({ top: conversation.value.scrollHeight, behavior: 'instant' }) }

watch(assistantOpen, async open => {
  if (!dialog.value) return
  if (open) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value.showModal()
    await nextTick(); input.value?.focus()
    await loadKnowledge()
  } else {
    stop(); dialog.value.close(); document.body.style.overflow = previousOverflow
    assistantOpener.value?.focus()
  }
})
onBeforeUnmount(() => { stop(); if (assistantOpen.value) document.body.style.overflow = previousOverflow })

async function send(value = question.value) {
  const message = value.trim()
  if (!message || pending.value || loadingKnowledge.value || indexError.value) return
  question.value = ''
  const history = messages.value.filter(turn => !turn.error).map(({ role, content }) => ({ role, content }))
  messages.value.push({ id: ++counter, role: 'user', content: message })
  const retrievalQuery = `${message} ${history.filter(turn => turn.role === 'user').slice(-1).map(turn => turn.content).join(' ')}`
  const directSources = retrieveKnowledge(chunks.value, message)
  const sources = directSources.length ? directSources : retrieveKnowledge(chunks.value, retrievalQuery)
  messages.value.push({ id: ++counter, role: 'assistant', content: '', sources, kind: 'local' })
  const reply = messages.value[messages.value.length - 1]
  pending.value = true
  const current = new AbortController()
  controller = current
  const timeout = setTimeout(() => current.abort('timeout'), 35_000)
  await scrollToLatest()
  try {
    if (endpoint && sources.some(source => source.ready)) {
      const answer = await askKnowledgeAssistant(endpoint, message, history, current.signal)
      if (!current.signal.aborted) { reply.content = answer.answer; reply.sources = answer.sources; reply.kind = 'ai' }
    } else { reply.content = localKnowledgeReply(sources) }
  } catch (error) {
    reply.content = localKnowledgeReply(sources)
    reply.error = current.signal.aborted ? current.signal.reason === 'timeout' ? '回答超时，已保留相关来源。' : '回答已停止。' : error instanceof Error ? error.message : '暂时无法获取 AI 回答。'
  } finally {
    clearTimeout(timeout)
    pending.value = false
    if (controller === current) controller = null
    await scrollToLatest()
    if (assistantOpen.value) input.value?.focus()
  }
}

function enter(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send() }
}
</script>

<template>
  <dialog id="ai-knowledge-drawer" ref="dialog" class="ai-drawer" :class="{ 'ai-motion-running': motionRunning }" aria-labelledby="ai-drawer-title" aria-describedby="ai-drawer-description" @cancel.prevent="close" @close="assistantOpen = false" @click="event => { if (event.target === dialog) close() }">
    <div class="ai-drawer-shell">
      <header class="ai-drawer-header">
        <div class="ai-drawer-brand"><span class="ai-brand-symbol"><Sparkles aria-hidden="true" /></span><div><small>ILOVFYU / KNOWLEDGE</small><h2 id="ai-drawer-title">与知识库对话<span class="ai-label">AI</span></h2></div></div>
        <button class="ai-icon-button" type="button" aria-label="关闭对话" title="关闭对话 · Esc" @click="close"><X aria-hidden="true" /></button>
      </header>
      <div class="ai-service-line"><span class="ai-service-dot" :class="{ connected: endpoint }" /><span>{{ endpoint ? 'DeepSeek · 根据已发布笔记回答' : '知识库检索 · AI 回答服务待连接' }}</span><button v-if="messages.length" type="button" class="ai-new-chat" :disabled="pending" @click="clear"><RotateCcw aria-hidden="true" />新对话</button></div>
      <p id="ai-drawer-description" class="ai-sr-only">查找博客中的知识笔记。回答附带来源；会话仅保留在当前页面。按 Escape 关闭。</p>
      <section ref="conversation" class="ai-conversation" aria-label="对话记录" :aria-busy="pending">
        <div v-if="!messages.length" class="ai-welcome">
          <span class="ai-welcome-mark"><BookOpen aria-hidden="true" /><span class="ai-welcome-star"><Sparkles aria-hidden="true" /></span></span>
          <p class="ai-welcome-eyebrow">FROM NOTES TO ANSWERS</p><h3>从一个问题，<br />找到一条思路。</h3>
          <p class="ai-welcome-copy">聊聊概念、代码与学习中的疑问。<br />从笔记中寻找线索，沿着来源继续阅读。</p>
          <div class="ai-suggestions"><span>可以从这里开始</span><button v-for="suggestion in suggestions" :key="suggestion" type="button" :disabled="loadingKnowledge || !!indexError" @click="send(suggestion)">{{ suggestion }}<ArrowUpRight aria-hidden="true" /></button></div>
          <p v-if="loadingKnowledge" class="ai-index-status" role="status">正在打开知识库…</p><p v-else-if="indexError" class="ai-error" role="alert">{{ indexError }}</p><p v-else class="ai-index-status">{{ availableArticles }} 篇笔记已有正文 · 其余目录持续整理中</p>
        </div>
        <ol v-else class="ai-message-list">
          <li v-for="turn in messages" :key="turn.id" class="ai-message" :class="`ai-message-${turn.role}`">
            <div class="ai-message-label"><Sparkles v-if="turn.role === 'assistant'" aria-hidden="true" />{{ turn.role === 'user' ? '你' : turn.kind === 'ai' ? '知识库助手' : '知识库检索' }}</div>
            <AIAnswerText v-if="turn.content && turn.kind === 'ai'" :content="turn.content" /><p v-else-if="turn.content" class="ai-message-content">{{ turn.content }}</p><p v-else class="ai-thinking" role="status"><LoaderCircle aria-hidden="true" />{{ endpoint ? '正在查阅笔记并整理回答…' : '正在查阅笔记…' }}</p>
            <p v-if="turn.error" class="ai-error" role="alert">{{ turn.error }}</p>
            <div v-if="turn.sources?.length" class="ai-source-list"><span class="ai-sources-heading">{{ turn.kind === 'ai' ? '回答参考' : '相关来源' }}</span><a v-for="(source, index) in turn.sources" :key="source.path" :href="withBase(source.path)" @click="close"><span class="ai-source-number">{{ index + 1 }}</span><span class="ai-source-copy"><strong>{{ source.title }}</strong><small>{{ source.series || '知识笔记' }}<template v-if="!source.ready"> · 正文待补充</template></small></span><ArrowUpRight aria-hidden="true" /></a></div>
          </li>
        </ol>
      </section>
      <footer class="ai-composer-wrap">
        <form class="ai-composer" @submit.prevent="send()"><label for="ai-question" class="ai-sr-only">向知识库提问</label><textarea id="ai-question" ref="input" v-model="question" rows="2" maxlength="600" placeholder="想了解什么？" :disabled="loadingKnowledge || !!indexError" aria-describedby="ai-composer-hint" @keydown="enter" /><div class="ai-composer-bottom"><span>{{ question.length }}/600</span><button v-if="pending" class="ai-send" type="button" aria-label="停止回答" title="停止回答" @click="stop"><Square aria-hidden="true" /></button><button v-else class="ai-send" type="submit" aria-label="发送问题" title="发送问题" :disabled="!question.trim() || loadingKnowledge || !!indexError"><ArrowUp aria-hidden="true" /></button></div></form>
        <p id="ai-composer-hint" class="ai-composer-hint">Enter 发送 · Shift + Enter 换行<span>会话仅保留在当前页面</span></p>
        <p v-if="endpoint" class="ai-privacy-note">提问、近期对话和相关公开笔记会发送至 DeepSeek。请勿输入密码或私人资料。</p>
      </footer>
    </div>
  </dialog>
</template>
