<script setup lang="ts">
import {
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogIn,
  Mail,
  Smartphone,
  Sparkles,
  UserPlus,
} from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

type AuthMode = 'login' | 'register'
type LoginMethod = 'phone' | 'email'

const AUTH_BASE_URL = import.meta.env.VITE_XIAKE_AUTH_BASE_URL?.trim() || '/api/xiake/auth'
const CONSOLE_URL = import.meta.env.VITE_XIAKE_CONSOLE_URL?.trim() || 'http://localhost:5175'
const POST_LOGIN_URL = import.meta.env.VITE_XIAKE_POST_LOGIN_URL?.trim() || `${CONSOLE_URL}/console/overview`

const mode = ref<AuthMode>('login')
const method = ref<LoginMethod>('phone')
const phone = ref('')
const email = ref('')
const password = ref('')
const code = ref('')
const agreementAccepted = ref(false)
const passwordVisible = ref(false)
const isSubmitting = ref(false)
const isSendingCode = ref(false)
const cooldown = ref(0)
const formMessage = ref('')
const formError = ref('')

const STAGE_COUNT = 5
const activeStage = ref(2)
const burstStage = ref(-1)
const renderPct = ref(68)
const workspaceGlow = ref({ x: 50, y: 50 })
const embers = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + (i % 3),
  delay: -((i * 1.7) % 11),
  duration: 9 + (i % 5) * 1.7,
  drift: ((i % 2 === 0 ? 1 : -1) * (14 + (i % 3) * 9)),
  warm: i % 2 === 0,
}))

let cooldownTimer = 0
let demoStageTimer = 0
let burstTimer = 0
let moveRaf = 0

const isRegister = computed(() => mode.value === 'register')
const account = computed(() => method.value === 'phone' ? phone.value.trim() : email.value.trim())
const accountLabel = computed(() => method.value === 'phone' ? '手机号' : '邮箱地址')
const accountPlaceholder = computed(() => method.value === 'phone' ? '请输入手机号' : 'name@example.com')
const submitLabel = computed(() => isRegister.value ? '创建账号' : '登录')

function getPostLoginUrl() {
  const destination = /^https?:\/\//i.test(POST_LOGIN_URL) ? POST_LOGIN_URL : withBase(POST_LOGIN_URL)
  return new URL(destination, window.location.origin).toString()
}

function authUrl(path: string) {
  return new URL(`${AUTH_BASE_URL.replace(/\/$/, '')}${path}`, window.location.origin)
}

function switchMode(nextMode: AuthMode) {
  mode.value = nextMode
  code.value = ''
  formError.value = ''
  formMessage.value = ''
}

function switchMethod(nextMethod: LoginMethod) {
  method.value = nextMethod
  code.value = ''
  formError.value = ''
  formMessage.value = ''
}

function validateAccount() {
  if (method.value === 'phone') return /^\+?[0-9\s-]{8,20}$/.test(account.value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.value)
}

function validateForm() {
  if (!validateAccount()) return `请输入有效的${accountLabel.value}`
  if (password.value.length < 8) return '密码至少需要 8 个字符'
  if (isRegister.value && !/^\d{6}$/.test(code.value)) return '请输入 6 位验证码'
  if (isRegister.value && !agreementAccepted.value) return '请先同意服务条款与隐私政策'
  return ''
}

async function parseError(response: Response) {
  try {
    const payload = await response.json() as { detail?: string; message?: string }
    return payload.detail || payload.message
  } catch {
    return undefined
  }
}

function startCooldown(seconds = 60) {
  cooldown.value = seconds
  window.clearInterval(cooldownTimer)
  cooldownTimer = window.setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) window.clearInterval(cooldownTimer)
  }, 1000)
}

async function sendCode() {
  if (isSendingCode.value || cooldown.value > 0) return
  formError.value = ''
  formMessage.value = ''
  if (!validateAccount()) {
    formError.value = `请先输入有效的${accountLabel.value}`
    return
  }

  isSendingCode.value = true
  try {
    const response = await fetch(authUrl('/code'), {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: method.value, account: account.value, purpose: 'register' }),
      cache: 'no-store',
      credentials: 'include',
    })
    if (!response.ok) throw new Error(await parseError(response) || '验证码发送失败，请稍后重试')
    formMessage.value = `验证码已发送至你的${accountLabel.value}`
    startCooldown()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '验证码发送失败，请稍后重试'
  } finally {
    isSendingCode.value = false
  }
}

function startSocialLogin(provider: 'github' | 'google' | 'wechat') {
  const url = authUrl(`/${provider}`)
  url.searchParams.set('return_to', getPostLoginUrl())
  window.location.assign(url.toString())
}

function startDemoLogin() {
  // 控制台登录网关识别 ?demo=1 后直接进入演示模式
  window.location.assign(new URL('/login?demo=1', CONSOLE_URL).toString())
}

function resetPassword() {
  if (!validateAccount()) {
    formError.value = `请先输入有效的${accountLabel.value}`
    return
  }
  const url = authUrl('/forgot-password')
  url.searchParams.set('channel', method.value)
  url.searchParams.set('account', account.value)
  url.searchParams.set('return_to', window.location.href)
  window.location.assign(url.toString())
}

async function submit() {
  if (isSubmitting.value) return
  formError.value = validateForm()
  formMessage.value = ''
  if (formError.value) return

  isSubmitting.value = true
  try {
    const response = await fetch(authUrl(isRegister.value ? '/register' : '/login'), {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: method.value,
        account: account.value,
        password: password.value,
        ...(isRegister.value ? { code: code.value } : {}),
      }),
      cache: 'no-store',
      credentials: 'include',
    })
    if (!response.ok) throw new Error(await parseError(response) || (isRegister.value ? '注册失败，请检查后重试' : '登录失败，请检查账号或密码'))

    window.location.assign(getPostLoginUrl())
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '认证服务暂时不可用'
  } finally {
    isSubmitting.value = false
  }
}

function pipeClass(index: number) {
  if (index < activeStage.value) return 'is-done'
  if (index === activeStage.value) return 'is-run'
  if (index === STAGE_COUNT - 1) return 'is-gate'
  return ''
}

function pipeStatus(index: number) {
  if (index < activeStage.value) return 'DONE'
  if (index === activeStage.value) {
    if (index === 3) return 'RENDERING'
    if (index === 4) return 'CHECKING'
    return 'RUNNING'
  }
  if (index === STAGE_COUNT - 1) return 'PENDING'
  return 'QUEUED'
}

function focusStage(index: number) {
  activeStage.value = index
  burstStage.value = index
  window.clearTimeout(burstTimer)
  burstTimer = window.setTimeout(() => { burstStage.value = -1 }, 760)
}

function advancePipeline() {
  activeStage.value = (activeStage.value + 1) % STAGE_COUNT
  renderPct.value = Math.min(renderPct.value + 7, 96)
  if (activeStage.value === 0) renderPct.value = 12
}

function onWorkspaceMove(event: PointerEvent) {
  if (moveRaf) return
  moveRaf = requestAnimationFrame(() => {
    moveRaf = 0
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    workspaceGlow.value = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }
  })
}

function startStageDemo() {
  window.clearInterval(demoStageTimer)
  demoStageTimer = window.setInterval(advancePipeline, 2600)
}

onMounted(() => {
  document.body.classList.add('xiake-active')
  startStageDemo()
})

onBeforeUnmount(() => {
  document.body.classList.remove('xiake-active')
  window.clearInterval(cooldownTimer)
  window.clearInterval(demoStageTimer)
  window.clearTimeout(burstTimer)
  window.cancelAnimationFrame(moveRaf)
})
</script>

<template>
  <main class="xiake-page xiake-auth-page xiake-auth-refined">
    <div class="xiake-fx" aria-hidden="true">
      <div class="xiake-scan-beam" />
      <div class="xiake-pointer-reticle"><i /><i /><span /></div>
      <div class="xiake-data-rail is-left"><i v-for="n in 6" :key="n" :style="{ animationDelay: `${n * -0.58}s` }" /></div>
      <div class="xiake-data-rail is-right"><i v-for="n in 6" :key="n" :style="{ animationDelay: `${n * -0.58 - 0.3}s` }" /></div>
      <div class="xiake-embers"><i v-for="(ember, i) in embers" :key="i" :style="{ left: `${ember.left}%`, width: `${ember.size}px`, height: `${ember.size}px`, '--drift': `${ember.drift}px`, animationDelay: `${ember.delay}s`, animationDuration: `${ember.duration}s` }" :class="ember.warm ? 'is-warm' : 'is-cool'" /></div>
    </div>

    <section class="xiake-auth-shell">
      <div class="xiake-auth-story">
        <p class="xiake-auth-eyebrow"><span /> XIAKE / PRODUCTION OS</p>
        <div class="xiake-auth-workspace" @pointermove="onWorkspaceMove">
          <div class="xiake-workspace-glow" :style="{ background: `radial-gradient(340px circle at ${workspaceGlow.x}% ${workspaceGlow.y}%, rgba(244,184,96,0.12), transparent 68%)` }" aria-hidden="true" />
          <div class="xiake-auth-workspace-head">
            <span><i /> PRODUCTION / 《旧城雨夜》</span>
            <small>IN PRODUCTION · 05 AGENTS</small>
          </div>
          <div class="xiake-auth-pipeline" aria-hidden="false">
            <button type="button" class="xiake-auth-pipe" :class="[pipeClass(0), { 'is-burst': burstStage === 0 }]" @click="focusStage(0)"><b>剧本</b><small>SCREENPLAY</small><i>{{ pipeStatus(0) }}</i></button>
            <em />
            <button type="button" class="xiake-auth-pipe" :class="[pipeClass(1), { 'is-burst': burstStage === 1 }]" @click="focusStage(1)"><b>分镜</b><small>STORYBOARD</small><i>{{ pipeStatus(1) }}</i></button>
            <em />
            <button type="button" class="xiake-auth-pipe" :class="[pipeClass(2), { 'is-burst': burstStage === 2 }]" @click="focusStage(2)"><b>美术</b><small>ART DIRECTION</small><i>{{ pipeStatus(2) }}</i></button>
            <em />
            <button type="button" class="xiake-auth-pipe" :class="[pipeClass(3), { 'is-burst': burstStage === 3 }]" @click="focusStage(3)"><b>生成</b><small>GEN / VFX</small><i>{{ pipeStatus(3) }}</i></button>
            <em />
            <button type="button" class="xiake-auth-pipe" :class="[pipeClass(4), { 'is-burst': burstStage === 4 }]" @click="focusStage(4)"><b>合规</b><small>QC GATE</small><i>{{ pipeStatus(4) }}</i></button>
          </div>
          <div class="xiake-auth-agent-list is-wide">
            <div class="xiake-auth-agent" :class="{ 'is-active': activeStage === 0 }"><b>01</b><span><strong>SCRIPTWRITER</strong><small>扩写人物对白</small></span><i>WRITING</i></div>
            <div class="xiake-auth-agent" :class="{ 'is-active': activeStage === 1 }"><b>02</b><span><strong>STORYBOARD</strong><small>拆分镜头节奏</small></span><i>FRAMING</i></div>
            <div class="xiake-auth-agent" :class="{ 'is-active': activeStage === 2 }"><b>03</b><span><strong>ART DIRECTOR</strong><small>统一画面风格</small></span><i>STYLING</i></div>
            <div class="xiake-auth-agent" :class="{ 'is-active': activeStage === 3 }"><b>04</b><span><strong>GEN ENGINE</strong><small>镜头生成与合成</small></span><i>RENDERING</i></div>
            <div class="xiake-auth-agent is-gate" :class="{ 'is-active': activeStage === 4 }"><b>05</b><span><strong>COMPLIANCE</strong><small>内容合规审核</small></span><i>CHECKING</i></div>
          </div>
          <div class="xiake-auth-workspace-output">
            <span>RENDER QUEUE</span>
            <i><b :style="{ width: `${renderPct}%` }" /></i>
            <strong>EP 01 / {{ renderPct }}%</strong>
          </div>
        </div>
        <h1>把成片生产，<br /><span>做成一条流水线</span></h1>
        <p class="xiake-auth-lead">虾壳把编剧、分镜、美术、生成与合规 Agent 编排进同一条生产流水线，让漫剧与短剧工作室按周交付成片。</p>
      </div>

      <div class="xiake-auth-panel">
        <div class="xiake-auth-panel-head">
          <span>虾壳账号</span>
          <small>{{ isRegister ? '创建账号' : '账号登录' }}</small>
        </div>

        <div class="xiake-auth-panel-body">
          <div class="xiake-auth-method" role="tablist" aria-label="账号方式">
            <button type="button" role="tab" :aria-selected="method === 'phone'" :class="{ active: method === 'phone' }" @click="switchMethod('phone')"><Smartphone />手机号</button>
            <button type="button" role="tab" :aria-selected="method === 'email'" :class="{ active: method === 'email' }" @click="switchMethod('email')"><Mail />邮箱</button>
          </div>

          <form class="xiake-auth-form" @submit.prevent="submit">
            <div class="xiake-field">
              <label for="xiake-account">{{ accountLabel }}</label>
              <input id="xiake-account" v-if="method === 'phone'" v-model="phone" type="tel" autocomplete="tel" inputmode="tel" :placeholder="accountPlaceholder" />
              <input id="xiake-account" v-else v-model="email" type="email" autocomplete="email" inputmode="email" :placeholder="accountPlaceholder" />
            </div>

            <div v-if="isRegister" class="xiake-field xiake-code-field">
              <label for="xiake-code">验证码</label>
              <div class="xiake-code-row">
                <input id="xiake-code" v-model="code" type="text" autocomplete="one-time-code" inputmode="numeric" maxlength="6" placeholder="6 位验证码" />
                <button type="button" :disabled="isSendingCode || cooldown > 0" @click="sendCode">
                  <LoaderCircle v-if="isSendingCode" class="xiake-spin" />
                  <template v-else>{{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}</template>
                </button>
              </div>
            </div>

            <div class="xiake-field">
              <div class="xiake-field-row">
                <label for="xiake-password">密码</label>
                <button v-if="!isRegister" type="button" class="xiake-forgot" @click="resetPassword">忘记密码？</button>
              </div>
              <div class="xiake-field-with-action">
                <input id="xiake-password" v-model="password" :type="passwordVisible ? 'text' : 'password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" placeholder="至少 8 个字符" />
                <button type="button" class="xiake-password-toggle" :title="passwordVisible ? '隐藏密码' : '显示密码'" :aria-label="passwordVisible ? '隐藏密码' : '显示密码'" @click="passwordVisible = !passwordVisible"><EyeOff v-if="passwordVisible" /><Eye v-else /></button>
              </div>
            </div>

            <label v-if="isRegister" class="xiake-auth-agreement">
              <input v-model="agreementAccepted" type="checkbox" />
              <span><i><Check /></i>我已阅读并同意<a :href="withBase('/terms/')">服务条款</a>与<a :href="withBase('/privacy/')">隐私政策</a></span>
            </label>

            <p v-if="formError" class="xiake-auth-feedback error" role="alert">{{ formError }}</p>
            <p v-if="formMessage" class="xiake-auth-feedback success" role="status">{{ formMessage }}</p>

            <button type="submit" class="xiake-auth-submit" :disabled="isSubmitting">
              <LoaderCircle v-if="isSubmitting" class="xiake-spin" />
              <component :is="isRegister ? UserPlus : LogIn" v-else />
              <span>{{ isSubmitting ? '正在处理...' : submitLabel }}</span>
            </button>
          </form>

          <p class="xiake-auth-switch">{{ isRegister ? '已有账号？' : '还没有账号？' }} <button type="button" @click="switchMode(isRegister ? 'login' : 'register')">{{ isRegister ? '登录' : '注册' }}</button></p>

          <div class="xiake-oauth">
            <span class="xiake-oauth-line" aria-hidden="true" />
            <button type="button" class="xiake-oauth-icon" title="使用 GitHub 登录" aria-label="使用 GitHub 登录" @click="startSocialLogin('github')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
            </button>
            <button type="button" class="xiake-oauth-icon is-google" title="使用 Google 登录" aria-label="使用 Google 登录" @click="startSocialLogin('google')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z" /><path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.23 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z" /></svg>
            </button>
            <button type="button" class="xiake-oauth-icon is-wechat" title="使用微信登录" aria-label="使用微信登录" @click="startSocialLogin('wechat')">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.25 4C4.7 4 1 6.93 1 10.55c0 2.08 1.18 3.95 3.12 5.2L3.2 18.9l4.1-2.08c.62.14 1.27.22 1.95.22.26 0 .52-.02.78-.04a6.4 6.4 0 0 1-.28-1.86c0-3.82 3.67-6.94 8.2-6.94.4 0 .8.03 1.2.08C18.25 5.8 14.35 4 9.25 4Zm-2.5 5.2a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm5 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm3.95 1.05c-3.6 0-6.5 2.28-6.5 5.1s2.9 5.1 6.5 5.1c.64 0 1.25-.08 1.82-.22l3.28 1.67-.73-2.52c1.33-.98 2.13-2.4 2.13-4.03 0-2.82-2.9-5.1-6.5-5.1Zm-1.95 4.25a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Zm3.9 0a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Z" /></svg>
            </button>
            <span class="xiake-oauth-line" aria-hidden="true" />
          </div>

          <div class="xiake-demo-login">
            <span class="xiake-demo-login-divider"><i />或<i /></span>
            <button type="button" class="xiake-demo-login-btn" @click="startDemoLogin">
              <Sparkles />
              <span>以演示模式登录</span>
            </button>
            <small>无需账号，直接体验虾壳生产控制台全部功能</small>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>
