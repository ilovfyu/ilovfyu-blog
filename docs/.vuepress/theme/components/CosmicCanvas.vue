<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vuepress/client'

type Star = {
  x: number
  y: number
  sx: number
  sy: number
  r: number
  depth: number
  base: number
  phase: number
  speed: number
  dx: number
  dy: number
  tone: 'cyan' | 'violet' | 'white'
}
type Glyph = { x: number; y: number; ch: string; size: number; alpha: number; vy: number; depth: number }
type TrailPoint = { x: number; y: number; life: number }
type Comet = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; length: number }
type DataPacket = { from: number; to: number; progress: number; speed: number; size: number; bit: '0' | '1' }

const canvasRef = ref<HTMLCanvasElement | null>(null)
const route = useRoute()
const CHARS = '<>{}()=>&*#$_+.·'

let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let lastFrame = 0
let lastPaint = 0
let nextComet = 2600
let running = false
let reduced = false
let mobile = false
let scroll = 0
let scrollTarget = 0
let stars: Star[] = []
let glyphs: Glyph[] = []
let trail: TrailPoint[] = []
let comets: Comet[] = []
let packets: DataPacket[] = []
const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, lastX: -9999, lastY: -9999, active: false, speed: 0 }

/* 浅色主题调色板：深色模式用亮色粒子，浅色模式用深色“墨点” */
const paletteDark = {
  starCyan: '240,180,90',
  starViolet: '210,170,120',
  starWhite: '228,208,180',
  constellation: '150,130,105',
  glyph: '158,140,118',
  packet: '224,163,72',
  packetCore: '236,220,190',
  packetBit: '214,180,130',
  violet: '154,126,96',
  cometHead: '238,224,196',
  magenta: '196,120,62',
}
const paletteLight = {
  starCyan: '192,133,44',
  starViolet: '150,112,80',
  starWhite: '140,124,102',
  constellation: '140,126,104',
  glyph: '156,140,116',
  packet: '192,133,44',
  packetCore: '192,133,44',
  packetBit: '150,112,80',
  violet: '150,112,80',
  cometHead: '192,133,44',
  magenta: '192,38,211',
}
let palette = paletteDark
let lightMode = false
let themeObserver: MutationObserver | null = null

function syncTheme() {
  lightMode = document.documentElement.dataset.theme === 'light'
  palette = lightMode ? paletteLight : paletteDark
  if (lightMode) stop()
  else if (!reduced && !running && typeof document !== 'undefined' && !document.hidden) start()
}

function wrap(value: number, max: number) {
  return ((value % max) + max) % max
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return

  mobile = innerWidth < 760 || matchMedia('(pointer: coarse)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 2)
  canvas.width = Math.round(innerWidth * dpr)
  canvas.height = Math.round(innerHeight * dpr)
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)

  const area = innerWidth * innerHeight
  const starCount = mobile ? Math.min(82, Math.floor(area / 12500)) : Math.min(180, Math.floor(area / 8500))
  stars = Array.from({ length: starCount }, () => {
    const depth = Math.random() * 0.82 + 0.18
    const toneRoll = Math.random()
    return {
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      sx: 0,
      sy: 0,
      r: (Math.random() * 1.15 + 0.28) * depth,
      depth,
      base: Math.random() * 0.42 + 0.14,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.65 + 0.18,
      dx: (Math.random() - 0.5) * 0.045 * depth,
      dy: (Math.random() - 0.5) * 0.026 * depth,
      tone: toneRoll > 0.86 ? 'cyan' : toneRoll > 0.72 ? 'violet' : 'white',
    }
  })

  packets = Array.from({ length: mobile ? 5 : 16 }, () => {
    const from = Math.floor(Math.random() * stars.length)
    let to = (from + 1) % stars.length
    let bestDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < stars.length; i++) {
      if (i === from) continue
      const distance = Math.hypot(stars[from].x - stars[i].x, stars[from].y - stars[i].y)
      if (distance > 55 && distance < 240 && distance < bestDistance) {
        to = i
        bestDistance = distance
      }
    }
    return {
      from,
      to,
      progress: Math.random(),
      speed: Math.random() * 0.0032 + 0.0015,
      size: Math.random() * 1.1 + 0.7,
      bit: Math.random() > 0.5 ? '1' : '0',
    }
  })

  glyphs = Array.from({ length: mobile ? 8 : 24 }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    ch: CHARS[Math.floor(Math.random() * CHARS.length)],
    size: Math.random() * 15 + 9,
    alpha: Math.random() * 0.1 + 0.025,
    vy: Math.random() * 0.16 + 0.035,
    depth: Math.random() * 0.75 + 0.25,
  }))
}

function drawNebula(time: number, w: number, h: number) {
  if (!ctx || lightMode) return
  const mouseX = pointer.active ? (pointer.x - w / 2) * 0.025 : 0
  const mouseY = pointer.active ? (pointer.y - h / 2) * 0.018 : 0
  const drift = Math.sin(time * 0.055)

  const nebula = ctx.createRadialGradient(w * 0.18 + drift * 70 + mouseX, h * 0.12 + mouseY, 0, w * 0.18, h * 0.12, w * 0.72)
  nebula.addColorStop(0, 'rgba(150,112,80,0.15)')
  nebula.addColorStop(0.42, 'rgba(150,120,80,0.065)')
  nebula.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = nebula
  ctx.fillRect(0, 0, w, h)

  const nebula2 = ctx.createRadialGradient(w * 0.86 - drift * 55 - mouseX, h * 0.84 - mouseY, 0, w * 0.86, h * 0.84, w * 0.56)
  nebula2.addColorStop(0, 'rgba(224,163,72,0.075)')
  nebula2.addColorStop(0.5, 'rgba(120,100,70,0.025)')
  nebula2.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = nebula2
  ctx.fillRect(0, 0, w, h)

  const core = ctx.createRadialGradient(w * 0.54, h * 0.48 + Math.cos(time * 0.04) * 35, 0, w * 0.54, h * 0.48, w * 0.3)
  core.addColorStop(0, 'rgba(196,120,62,0.035)')
  core.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = core
  ctx.fillRect(0, 0, w, h)
}

function positionStars(delta: number, w: number, h: number) {
  const px = pointer.active ? (pointer.x - w / 2) / w : 0
  const py = pointer.active ? (pointer.y - h / 2) / h : 0

  for (const star of stars) {
    star.x = wrap(star.x + star.dx * delta, w)
    star.y = wrap(star.y + star.dy * delta, h)
    star.sx = wrap(star.x - px * 24 * star.depth, w)
    star.sy = wrap(star.y - scroll * 0.006 * star.depth - py * 15 * star.depth, h)
  }
}

function drawConstellations() {
  if (!ctx || mobile) return
  let lines = 0
  ctx.lineWidth = 0.7

  for (let i = 0; i < stars.length && lines < 25; i++) {
    const a = stars[i]
    if (a.depth < 0.72 || a.base < 0.32) continue
    for (let j = i + 1; j < stars.length && lines < 25; j++) {
      const b = stars[j]
      if (b.depth < 0.72 || b.base < 0.32) continue
      const dx = a.sx - b.sx
      const dy = a.sy - b.sy
      const distanceSq = dx * dx + dy * dy
      if (distanceSq > 16384) continue
      const distance = Math.sqrt(distanceSq)
      ctx.strokeStyle = `rgba(${palette.constellation},${(1 - distance / 128) * 0.075})`
      ctx.beginPath()
      ctx.moveTo(a.sx, a.sy)
      ctx.lineTo(b.sx, b.sy)
      ctx.stroke()
      lines++
    }
  }
}

function drawStars(time: number) {
  if (!ctx) return

  for (const star of stars) {
    let alpha = Math.max(0.035, star.base + Math.sin(time * star.speed + star.phase) * 0.24)
    if (lightMode) alpha *= 0.5
    const color = star.tone === 'cyan' ? palette.starCyan : star.tone === 'violet' ? palette.starViolet : palette.starWhite
    if (star.depth > 0.78 && alpha > 0.42) {
      ctx.beginPath()
      ctx.arc(star.sx, star.sy, star.r * 3.4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${color},${alpha * 0.08})`
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(star.sx, star.sy, star.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${color},${alpha})`
    ctx.fill()
  }
}

function drawDataPackets(delta: number) {
  if (!ctx || lightMode) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  for (const packet of packets) {
    const from = stars[packet.from]
    const to = stars[packet.to]
    if (!from || !to) continue
    const distance = Math.hypot(to.sx - from.sx, to.sy - from.sy)
    if (distance > 280) continue

    packet.progress = wrap(packet.progress + packet.speed * delta, 1)
    const eased = packet.progress * packet.progress * (3 - 2 * packet.progress)
    const x = from.sx + (to.sx - from.sx) * eased
    const y = from.sy + (to.sy - from.sy) * eased
    const alpha = Math.sin(packet.progress * Math.PI)
    const tailProgress = Math.max(0, eased - 0.12)
    const tailX = from.sx + (to.sx - from.sx) * tailProgress
    const tailY = from.sy + (to.sy - from.sy) * tailProgress
    const gradient = ctx.createLinearGradient(tailX, tailY, x, y)
    gradient.addColorStop(0, `rgba(${palette.packet},0)`)
    gradient.addColorStop(1, `rgba(${palette.packet},${alpha * 0.55})`)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(x, y)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, packet.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${palette.packetCore},${alpha * 0.92})`
    ctx.shadowBlur = 10
    ctx.shadowColor = `rgba(${palette.packet},0.9)`
    ctx.fill()
    ctx.shadowBlur = 0

    if (!mobile && packet.progress > 0.35 && packet.progress < 0.7) {
      ctx.fillStyle = `rgba(${palette.packetBit},${alpha * 0.28})`
      ctx.font = '7px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillText(packet.bit, x + 6, y - 5)
    }
  }
  ctx.restore()
}

function drawPointerField() {
  if (!ctx || !pointer.active || mobile || lightMode) return
  const radius = 185

  ctx.save()
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(pointer.x, pointer.y)
  ctx.rotate(-0.07)
  ctx.lineWidth = 0.65

  for (let n = -4; n <= 4; n++) {
    const offset = n * 42
    const alpha = 0.13 * (1 - Math.abs(n) / 6)
    ctx.strokeStyle = `rgba(${palette.packet},${alpha})`
    ctx.beginPath()
    ctx.moveTo(offset, -radius)
    ctx.quadraticCurveTo(offset * 0.72, 0, offset, radius)
    ctx.stroke()

    ctx.strokeStyle = `rgba(${palette.violet},${alpha * 0.85})`
    ctx.beginPath()
    ctx.moveTo(-radius, offset)
    ctx.quadraticCurveTo(0, offset * 0.72, radius, offset)
    ctx.stroke()
  }
  ctx.restore()

  const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 245)
  glow.addColorStop(0, `rgba(${palette.packet},${lightMode ? 0.05 : 0.105})`)
  glow.addColorStop(0.38, `rgba(${palette.violet},${lightMode ? 0.02 : 0.045})`)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(pointer.x - 245, pointer.y - 245, 490, 490)

  const nearby: Star[] = []
  for (const star of stars) {
    const distance = Math.hypot(star.sx - pointer.x, star.sy - pointer.y)
    if (distance < 165 && star.depth > 0.42 && nearby.length < 8) {
      nearby.push(star)
      ctx.strokeStyle = `rgba(${palette.packet},${(1 - distance / 165) * 0.22})`
      ctx.beginPath()
      ctx.moveTo(pointer.x, pointer.y)
      ctx.lineTo(star.sx, star.sy)
      ctx.stroke()
    }
  }

  ctx.strokeStyle = `rgba(${palette.magenta},0.32)`
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.arc(pointer.x, pointer.y, 10 + pointer.speed * 7, 0, Math.PI * 1.45)
  ctx.stroke()
}

function drawTrail(delta: number) {
  if (!ctx || mobile || lightMode) return
  if (trail.length > 1) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'

    for (let i = 1; i < trail.length; i++) {
      const from = trail[i - 1]
      const to = trail[i]
      const alpha = Math.min(from.life, to.life) * 0.26
      ctx.strokeStyle = `rgba(${i % 2 ? palette.packet : palette.violet},${alpha})`
      ctx.lineWidth = 0.6 + to.life * 1.8
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }
    ctx.restore()
  }

  trail.forEach((point) => { point.life -= 0.035 * delta })
  trail = trail.filter((point) => point.life > 0)
}

function spawnComet(w: number, h: number) {
  const life = 85 + Math.random() * 30
  comets.push({
    x: w + 90,
    y: Math.random() * h * 0.48 - 30,
    vx: -(7 + Math.random() * 4),
    vy: 3.2 + Math.random() * 2.4,
    life,
    maxLife: life,
    length: 6 + Math.random() * 5,
  })
}

function drawComets(delta: number) {
  if (!ctx || lightMode) return

  for (const comet of comets) {
    comet.x += comet.vx * delta
    comet.y += comet.vy * delta
    comet.life -= delta
    const alpha = Math.min(1, comet.life / 18, (comet.maxLife - comet.life) / 12)
    const tailX = comet.x - comet.vx * comet.length
    const tailY = comet.y - comet.vy * comet.length
    const gradient = ctx.createLinearGradient(tailX, tailY, comet.x, comet.y)
    gradient.addColorStop(0, `rgba(${palette.packet},0)`)
    gradient.addColorStop(0.75, `rgba(${palette.violet},${alpha * 0.28})`)
    gradient.addColorStop(1, `rgba(${palette.cometHead},${alpha * 0.95})`)
    ctx.save()
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.25
    ctx.shadowBlur = 12
    ctx.shadowColor = `rgba(${palette.packet},0.7)`
    ctx.beginPath()
    ctx.moveTo(tailX, tailY)
    ctx.lineTo(comet.x, comet.y)
    ctx.stroke()
    ctx.restore()
  }

  comets = comets.filter((comet) => comet.life > 0 && comet.x > -180 && comet.y < innerHeight + 120)
}

function drawGlyphs(delta: number, w: number, h: number) {
  if (!ctx || lightMode) return
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const glyph of glyphs) {
    glyph.y += glyph.vy * delta
    if (glyph.y > h + 30) {
      glyph.y = -30
      glyph.x = Math.random() * w
    }
    const y = wrap(glyph.y - scroll * 0.004 * glyph.depth, h + 60) - 30
    ctx.font = `${glyph.size}px "JetBrains Mono", ui-monospace, monospace`
    ctx.fillStyle = `rgba(${palette.glyph},${glyph.alpha})`
    ctx.fillText(glyph.ch, glyph.x, y)
  }
}

function render(timeMs: number, animate = true) {
  if (!ctx) return
  const w = innerWidth
  const h = innerHeight
  const delta = lastFrame ? Math.min(2, (timeMs - lastFrame) / 16.67) : 1
  const time = timeMs / 1000
  lastFrame = timeMs
  ctx.clearRect(0, 0, w, h)

  if (animate) {
    pointer.x += (pointer.tx - pointer.x) * 0.1
    pointer.y += (pointer.ty - pointer.y) * 0.1
    pointer.speed *= 0.9
    scroll += (scrollTarget - scroll) * 0.035
  }

  drawNebula(time, w, h)
  positionStars(animate ? delta : 0, w, h)
  drawStars(time)
}

function draw(time: number) {
  if (!running) return
  const readingPage = route.path.startsWith('/posts/') || route.path.startsWith('/topics/') || route.path.startsWith('/specials/math/notes/')
  const frameInterval = mobile || readingPage ? 1000 / 30 : 1000 / 60
  if (!lastPaint || time - lastPaint >= frameInterval) {
    render(time)
    lastPaint = time
  }
  raf = requestAnimationFrame(draw)
}

function start() {
  if (running || reduced || document.hidden || lightMode) return
  running = true
  lastFrame = 0
  lastPaint = 0
  raf = requestAnimationFrame(draw)
}

function stop() {
  running = false
  cancelAnimationFrame(raf)
}

function onPointer(e: PointerEvent) {
  if (!pointer.active) {
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.lastX = e.clientX
    pointer.lastY = e.clientY
  }
  const distance = Math.hypot(e.clientX - pointer.lastX, e.clientY - pointer.lastY)
  pointer.tx = e.clientX
  pointer.ty = e.clientY
  pointer.active = true
  pointer.speed = Math.min(1, distance / 42)
  if (!mobile && distance > 4) {
    trail.push({ x: e.clientX, y: e.clientY, life: 1 })
    if (trail.length > 32) trail.shift()
  }
  pointer.lastX = e.clientX
  pointer.lastY = e.clientY
}

function onPointerLeave() {
  pointer.active = false
}

function onScroll() {
  scrollTarget = window.scrollY
}

function onResize() {
  resize()
  if (reduced) render(0, false)
}

function onVisibility() {
  if (document.hidden) stop()
  else start()
}

onMounted(() => {
  reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  scroll = scrollTarget = window.scrollY
  syncTheme()
  resize()
  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('pointerleave', onPointerLeave)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)

  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  if (reduced) render(0, false)
  else start()
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointer)
  window.removeEventListener('pointerleave', onPointerLeave)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  themeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvasRef" class="cosmic-canvas" aria-hidden="true" />
</template>
