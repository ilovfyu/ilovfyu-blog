<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

const API_BASE = import.meta.env.VITE_AI_CHAT_BASE_URL?.trim() || ''
const open = ref(false)
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([
  { role: 'assistant', content: '你好，我是 ILOVFYU 的 AI 助手。可以问我关于博客里的文章、项目或技术问题。' },
])
const input = ref('')
const loading = ref(false)
const bodyScrollLocked = ref(false)

const btnEl = ref<HTMLButtonElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)

let resizeObserver: ResizeObserver | null = null
let mountedEl: HTMLElement | null = null

function insertButton() {
  if (mountedEl) return
  const container = document.querySelector('.vp-navbar-social-links')
  if (!container) return
  const anchor = container.querySelector('.vp-social-link')
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'vp-ai-chat-toggle no-icon'
  btn.setAttribute('aria-label', 'AI 助手')
  btn.setAttribute('title', 'AI 助手')
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>`
  btn.addEventListener('click', () => { open.value = true })
  // 插入到 GitHub 图标之后
  if (anchor) anchor.after(btn)
  else container.appendChild(btn)
  mountedEl = btn
}

function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => inputEl.value?.focus())
  }
}

function send() {
  const text = input.value.trim()
  if (!text || loading.value) return
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true
  scrollToBottom()

  if (!API_BASE) {
    // 本地演示：关键词回复
    window.setTimeout(() => {
      const reply = localReply(text)
      messages.value.push({ role: 'assistant', content: reply })
      loading.value = false
      scrollToBottom()
    }, 500)
    return
  }

  fetch(`${API_BASE.replace(/\/$/, '')}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.value }),
  })
    .then((res) => res.json())
    .then((data) => {
      messages.value.push({ role: 'assistant', content: data.reply ?? '抱歉，我没有理解你的问题。' })
    })
    .catch(() => {
      messages.value.push({ role: 'assistant', content: 'AI 服务暂时不可用，请稍后再试。' })
    })
    .finally(() => {
      loading.value = false
      scrollToBottom()
    })
}

function localReply(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('你好') || t.includes('hi') || t.includes('hello')) {
    return '你好！很高兴见到你。我可以帮你快速了解博客内容，比如搜索某篇文章或某个项目。'
  }
  if (t.includes('项目') || t.includes('project')) {
    return '博客里有不少项目记录：SRE 智能运维平台、中转站、标注工具平台、愈语、弈机、墨影等。想看哪个可以告诉我。'
  }
  if (t.includes('墨影') || t.includes('moyin')) {
    return '墨影（MOYIN）是网页端课程生成工作流平台，把书籍与资料通过「资料入库 → 教学设计 → 板书素材 → 合成课程 → 互动交付」生成教学课程。'
  }
  if (t.includes('虾壳') || t.includes('xiake')) {
    return '虾壳是多 Agent 漫剧影视工作流平台，把编剧、分镜、美术、生成与合规 Agent 编排进同一条生产流水线。'
  }
  if (t.includes('联系') || t.includes('关于') || t.includes('作者')) {
    return '关于博主页面有作者介绍和联系方式：访问 /about/ 可以查看。'
  }
  return `关于「${text}」，目前我的演示版本能回答常见问题。接入后端后我会知道得更多。你可以换一种问法，或问我博客里的项目。`
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}

onMounted(() => {
  insertButton()
  // 路由切换后重新尝试插入（navbar 可能重建）
  const container = document.querySelector('.vp-navbar-social-links')
  if (container) {
    resizeObserver = new ResizeObserver(() => {
      if (!mountedEl || !mountedEl.isConnected) insertButton()
    })
    resizeObserver.observe(document.body)
  }
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mountedEl?.remove()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <transition name="ai-drawer">
      <div v-if="open" class="vp-ai-chat" aria-hidden="false">
        <div class="vp-ai-chat-backdrop" @click="open = false" />
        <aside class="vp-ai-chat-drawer" role="dialog" aria-label="AI 助手">
          <header class="vp-ai-chat-head">
            <div class="vp-ai-chat-title">
              <span class="vp-ai-chat-mark"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>
              <div>
                <strong>AI 助手</strong>
                <small>ILOVFYU · INTELLIGENCE</small>
              </div>
            </div>
            <button type="button" class="vp-ai-chat-close" aria-label="关闭" @click="open = false">✕</button>
          </header>

          <div ref="scrollEl" class="vp-ai-chat-body">
            <div v-for="(msg, i) in messages" :key="i" class="vp-ai-msg" :class="msg.role">
              <span class="vp-ai-msg-avatar">{{ msg.role === 'user' ? '我' : 'AI' }}</span>
              <div class="vp-ai-msg-bubble">{{ msg.content }}</div>
            </div>
            <div v-if="loading" class="vp-ai-msg assistant">
              <span class="vp-ai-msg-avatar">AI</span>
              <div class="vp-ai-msg-bubble vp-ai-typing"><i /><i /><i /></div>
            </div>
          </div>

          <footer class="vp-ai-chat-foot">
            <input
              ref="inputEl"
              v-model="input"
              type="text"
              placeholder="向 AI 提问，回车发送..."
              @keydown.enter="send"
            />
            <button type="button" :disabled="loading || !input.trim()" @click="send">发送</button>
          </footer>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.vp-ai-chat-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  color: var(--vp-c-text-2, rgba(168, 158, 140, 0.68));
  background: transparent;
  cursor: pointer;
  transition: color var(--vp-t-color, 0.25s);
}
.vp-ai-chat-toggle:hover {
  color: var(--vp-c-text-1, rgba(238, 232, 220, 0.92));
}

.vp-ai-chat {
  position: fixed;
  inset: 0;
  z-index: 3000;
}
.vp-ai-chat-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(14, 12, 10, 0.55);
  backdrop-filter: blur(2px);
}
.vp-ai-chat-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: min(420px, 100vw);
  border-left: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
  background: linear-gradient(170deg, rgba(22, 19, 15, 0.98), rgba(20, 18, 14, 0.99));
  box-shadow: -30px 0 80px -40px rgba(224, 163, 72, 0.35);
}
.vp-ai-chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
}
.vp-ai-chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.vp-ai-chat-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgba(154, 126, 96, 0.4);
  border-radius: 4px;
  color: var(--vp-c-brand-2, #9a7e60);
  background: rgba(154, 126, 96, 0.1);
  box-shadow: inset 0 0 18px rgba(154, 126, 96, 0.12);
}
.vp-ai-chat-title strong {
  display: block;
  font: 650 15px var(--vp-font, sans-serif);
}
.vp-ai-chat-title small {
  display: block;
  margin-top: 3px;
  color: var(--vp-c-text-3, rgba(168, 158, 140, 0.4));
  font: 8px var(--vp-font-mono, monospace);
  letter-spacing: 0.14em;
}
.vp-ai-chat-close {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  color: var(--vp-c-text-3, rgba(168, 158, 140, 0.4));
  background: transparent;
  cursor: pointer;
  font-size: 14px;
}
.vp-ai-chat-close:hover {
  color: var(--vp-c-text-1, rgba(238, 232, 220, 0.92));
}
.vp-ai-chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.vp-ai-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.vp-ai-msg.user {
  flex-direction: row-reverse;
}
.vp-ai-msg-avatar {
  display: grid;
  width: 28px;
  height: 28px;
  min-width: 28px;
  place-items: center;
  border: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
  border-radius: 50%;
  color: var(--vp-c-text-2, rgba(168, 158, 140, 0.68));
  background: rgba(150, 138, 118, 0.06);
  font: 500 10px var(--vp-font, sans-serif);
}
.vp-ai-msg.user .vp-ai-msg-avatar {
  border-color: rgba(224, 163, 72, 0.35);
  color: var(--vp-c-brand-1, #e0a348);
  background: rgba(224, 163, 72, 0.08);
}
.vp-ai-msg-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
  border-radius: 6px;
  color: var(--vp-c-text-1, rgba(238, 232, 220, 0.92));
  background: rgba(26, 22, 18, 0.8);
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}
.vp-ai-msg.user .vp-ai-msg-bubble {
  border-color: rgba(224, 163, 72, 0.3);
  background: rgba(224, 163, 72, 0.08);
}
.vp-ai-typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.vp-ai-typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vp-c-text-3, rgba(168, 158, 140, 0.4));
  animation: ai-bounce 1.2s infinite;
}
.vp-ai-typing i:nth-child(2) { animation-delay: 0.15s; }
.vp-ai-typing i:nth-child(3) { animation-delay: 0.3s; }
@keyframes ai-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(-4px); opacity: 1; }
}
.vp-ai-chat-foot {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
}
.vp-ai-chat-foot input {
  flex: 1;
  min-width: 0;
  padding: 11px 14px;
  border: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
  border-radius: 4px;
  outline: none;
  color: var(--vp-c-text-1, rgba(238, 232, 220, 0.92));
  background: rgba(14, 12, 10, 0.6);
  font-size: 13px;
}
.vp-ai-chat-foot input:focus {
  border-color: var(--vp-c-brand-1, #e0a348);
}
.vp-ai-chat-foot button {
  padding: 11px 18px;
  border: 1px solid rgba(150, 142, 88, 0.5);
  border-radius: 4px;
  color: #0b0a07;
  background: linear-gradient(120deg, #c4bd93, #b89b7a);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.vp-ai-chat-foot button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-drawer-enter-active,
.ai-drawer-leave-active {
  transition: opacity 0.25s;
}
.ai-drawer-enter-active .vp-ai-chat-drawer,
.ai-drawer-leave-active .vp-ai-chat-drawer {
  transition: transform 0.25s ease;
}
.ai-drawer-enter-from,
.ai-drawer-leave-to {
  opacity: 0;
}
.ai-drawer-enter-from .vp-ai-chat-drawer,
.ai-drawer-leave-to .vp-ai-chat-drawer {
  transform: translateX(100%);
}
</style>
