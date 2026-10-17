<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Eye, EyeOff, LogIn, Mail, Smartphone, Sparkles, UserPlus } from '@lucide/vue'
import { withBase, usePageData } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
const page = usePageData()
const project = computed(() => page.value.frontmatter.project as ProjectMeta)
const mode = ref<'login' | 'register'>('login'), method = ref<'phone' | 'email'>('phone')
const phone = ref(''), email = ref(''), password = ref(''), code = ref('')
const agreementAccepted = ref(false), passwordVisible = ref(false)
const formMessage = ref('')
const isRegister = computed(() => mode.value === 'register')
const accountLabel = computed(() => method.value === 'phone' ? '手机号' : '邮箱地址')
const accountPlaceholder = computed(() => method.value === 'phone' ? '演示手机号' : 'demo@example.com')
const submitLabel = computed(() => isRegister.value ? '创建账号' : '登录')
const switchMode = (value: 'login' | 'register') => { mode.value = value; formMessage.value = '' }
const switchMethod = (value: 'phone' | 'email') => { method.value = value; formMessage.value = '' }
const explainDemo = () => { formMessage.value = '这是静态产品界面演示，不会发送、保存账号或创建用户。' }
const activeStage = ref(2), burstStage = ref(-1), renderPct = ref(68)
const workspaceGlow = ref({ x: 50, y: 50 })
const embers = Array.from({ length: 14 }, (_, i) => ({ left: (i * 13) % 100, size: 2 + i % 3, drift: i % 2 ? 25 : -25, delay: -i, duration: 6 + i % 4, warm: i % 2 === 0 }))
let timer = 0, burstTimer = 0
const pipeClass = (i: number) => i < activeStage.value ? 'is-done' : i === activeStage.value ? 'is-run' : i === 4 ? 'is-gate' : ''
const pipeStatus = (i: number) => i < activeStage.value ? 'DONE' : i === activeStage.value ? 'RUNNING' : 'QUEUED'
function focusStage(i: number) { activeStage.value = i; burstStage.value = i; clearTimeout(burstTimer); burstTimer = window.setTimeout(() => { burstStage.value = -1 }, 760) }
function onWorkspaceMove(event: PointerEvent) {
 const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
 workspaceGlow.value = { x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 }
}
onMounted(() => {
 if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = window.setInterval(() => { activeStage.value = (activeStage.value + 1) % 5; renderPct.value = activeStage.value === 0 ? 12 : Math.min(renderPct.value + 7, 96) }, 2600)
})
onBeforeUnmount(() => { clearInterval(timer); clearTimeout(burstTimer) })
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
        <h1>{{ project.headline[0] }}<br /><span>{{ project.headline[1] }}</span></h1>
        <p class="xiake-auth-lead">{{ project.intro }}</p>
      </div>

      <div class="xiake-auth-panel">
        <div class="xiake-auth-panel-head">
          <span>虾壳账号</span>
          <small>{{ isRegister ? '创建账号' : '账号登录' }}</small>
        </div>

        <div class="xiake-auth-panel-body"><p class="xiake-auth-feedback" role="note">界面演示，请勿输入真实账号或密码。</p>
          <div class="xiake-auth-method" role="group" aria-label="账号方式">
            <button type="button" :aria-pressed="method === 'phone'" :class="{ active: method === 'phone' }" @click="switchMethod('phone')"><Smartphone />手机号</button>
            <button type="button" :aria-pressed="method === 'email'" :class="{ active: method === 'email' }" @click="switchMethod('email')"><Mail />邮箱</button>
          </div>

          <form class="xiake-auth-form" @submit.prevent="explainDemo">
            <div class="xiake-field">
              <label for="xiake-account">{{ accountLabel }}</label>
              <input id="xiake-account" v-if="method === 'phone'" v-model="phone" type="tel" autocomplete="tel" inputmode="tel" :placeholder="accountPlaceholder" />
              <input id="xiake-account" v-else v-model="email" type="email" autocomplete="email" inputmode="email" :placeholder="accountPlaceholder" />
            </div>

            <div v-if="isRegister" class="xiake-field xiake-code-field">
              <label for="xiake-code">验证码</label>
              <div class="xiake-code-row">
                <input id="xiake-code" v-model="code" type="text" autocomplete="one-time-code" inputmode="numeric" maxlength="6" placeholder="6 位验证码" />
                <button type="button" @click="explainDemo">获取验证码</button>
              </div>
            </div>

            <div class="xiake-field">
              <div class="xiake-field-row">
                <label for="xiake-password">密码</label>
                <button v-if="!isRegister" type="button" class="xiake-forgot" @click="explainDemo">忘记密码？</button>
              </div>
              <div class="xiake-field-with-action">
                <input id="xiake-password" v-model="password" :type="passwordVisible ? 'text' : 'password'" :autocomplete="isRegister ? 'new-password' : 'current-password'" placeholder="至少 8 个字符" />
                <button type="button" class="xiake-password-toggle" :title="passwordVisible ? '隐藏密码' : '显示密码'" :aria-label="passwordVisible ? '隐藏密码' : '显示密码'" @click="passwordVisible = !passwordVisible"><EyeOff v-if="passwordVisible" /><Eye v-else /></button>
              </div>
            </div>

            <label v-if="isRegister" class="xiake-auth-agreement">
              <input v-model="agreementAccepted" type="checkbox" />
              <span><i><Check /></i>我已阅读并同意<a :href="withBase(project.record)">服务条款</a>与<a :href="withBase(project.record)">隐私政策</a></span>
            </label>

            <p v-if="formMessage" class="xiake-auth-feedback success" role="status">{{ formMessage }}</p>

            <button type="submit" class="xiake-auth-submit">
              <component :is="isRegister ? UserPlus : LogIn" aria-hidden="true" />
              <span>{{ submitLabel }}</span>
            </button>
          </form>

          <p class="xiake-auth-switch">{{ isRegister ? '已有账号？' : '还没有账号？' }} <button type="button" @click="switchMode(isRegister ? 'login' : 'register')">{{ isRegister ? '登录' : '注册' }}</button></p>

          <div class="xiake-oauth">
            <span class="xiake-oauth-line" aria-hidden="true" />
            <button type="button" class="xiake-oauth-icon" title="使用 GitHub 登录" aria-label="使用 GitHub 登录" @click="explainDemo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
            </button>
            <button type="button" class="xiake-oauth-icon is-google" title="使用 Google 登录" aria-label="使用 Google 登录" @click="explainDemo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.23-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" /><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.75Z" /><path fill="#FBBC05" d="M6.54 13.83A5.86 5.86 0 0 1 6.23 12c0-.64.11-1.26.31-1.83V7.64H3.3A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.05 4.36l3.24-2.53Z" /><path fill="#EA4335" d="M12 6.14c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.23 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z" /></svg>
            </button>
            <button type="button" class="xiake-oauth-icon is-wechat" title="使用微信登录" aria-label="使用微信登录" @click="explainDemo">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.25 4C4.7 4 1 6.93 1 10.55c0 2.08 1.18 3.95 3.12 5.2L3.2 18.9l4.1-2.08c.62.14 1.27.22 1.95.22.26 0 .52-.02.78-.04a6.4 6.4 0 0 1-.28-1.86c0-3.82 3.67-6.94 8.2-6.94.4 0 .8.03 1.2.08C18.25 5.8 14.35 4 9.25 4Zm-2.5 5.2a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm5 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm3.95 1.05c-3.6 0-6.5 2.28-6.5 5.1s2.9 5.1 6.5 5.1c.64 0 1.25-.08 1.82-.22l3.28 1.67-.73-2.52c1.33-.98 2.13-2.4 2.13-4.03 0-2.82-2.9-5.1-6.5-5.1Zm-1.95 4.25a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Zm3.9 0a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9Z" /></svg>
            </button>
            <span class="xiake-oauth-line" aria-hidden="true" />
          </div>

          <div class="xiake-demo-login">
            <span class="xiake-demo-login-divider"><i />或<i /></span>
            <a class="xiake-demo-login-btn" :href="withBase(project.record)">
              <Sparkles />
              <span>查看项目记录</span>
            </a>
            <small>静态界面演示 · 查看项目记录了解设计</small>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>
