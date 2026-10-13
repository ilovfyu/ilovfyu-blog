export type BookPalette = { primary: string; secondary: string; ink: string; dark: boolean }
export type BookContent = { title: string; summary: string; label: string; tags: string[]; preview?: { heading: string; paragraphs: string[] } }
export type BookTextures = [HTMLCanvasElement, HTMLCanvasElement]
type Point = { x: number; y: number }
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }

export function createBookTextures(content: BookContent, palette: BookPalette, compact = false): BookTextures {
  const pages = [document.createElement('canvas'), document.createElement('canvas')] as BookTextures
  const font = '"Noto Sans SC", "PingFang SC", sans-serif'
  pages.forEach((page, index) => {
    page.width = 600; page.height = 800
    const ctx = page.getContext('2d')!
    const text = (value: string, y: number, size: number, maxLines: number, color = palette.ink, weight = 400) => {
      ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textBaseline = 'top'
      const lines: string[] = []; let line = ''
      for (const char of value) {
        if (ctx.measureText(line + char).width > 450 && line) { lines.push(line); line = char } else line += char
      }
      if (line) lines.push(line)
      lines.slice(0, maxLines).forEach((value, row) => ctx.fillText(value + (row === maxLines - 1 && lines.length > maxLines ? '…' : ''), 75, y + row * size * 1.65))
      return y + Math.min(lines.length, maxLines) * size * 1.65
    }
    text(index ? content.title : content.label, 76, compact ? 26 : 19, 1, palette.primary, 500)
    ctx.fillStyle = palette.primary; ctx.globalAlpha = .5; ctx.fillRect(75, 128, 450, 1); ctx.globalAlpha = 1
    if (!index) {
      let y = text(content.title, 180, compact ? 56 : 42, compact ? 3 : 4, palette.ink, 600)
      y = text(content.summary, y + 30, compact ? 32 : 24, compact ? 3 : 5)
      if (!compact) text(content.tags.slice(0, 3).map(tag => `#${tag}`).join('  '), Math.min(700, y + 38), 18, 2, palette.secondary)
    } else {
      let y = text(content.preview?.heading || content.title, 172, compact ? 40 : 29, 2, palette.primary, 500) + 28
      for (const paragraph of (content.preview?.paragraphs.length ? content.preview.paragraphs : [content.summary]).slice(0, compact ? 1 : 2)) {
        const size = compact ? 38 : 25, rows = Math.floor((710 - y) / (size * 1.65))
        if (rows < 1) break
        y = text(paragraph, y, size, rows) + 24
      }
    }
    ctx.globalAlpha = .5; text(String(index + 1).padStart(2, '0'), 750, 16, 1, palette.primary); ctx.globalAlpha = 1
  })
  return pages
}

/** A spectral book made of translucent leaves and luminous contours, never opaque paper. */
export function drawArticleBook(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, palette: BookPalette, textures?: BookTextures) {
  ctx.clearRect(0, 0, width, height)
  const p = clamp(progress), opening = ease(p / .3), turning = ease((p - .18) / .5)
  const dissolve = ease((p - .65) / .35), materialize = ease(p / .16), opacity = materialize * (1 - dissolve)
  if (opacity <= 0) return
  const scale = Math.min(width * .30, height * .34, 350) * (.86 + opening * .14 + dissolve * .06)
  const centerY = height * (.53 - opening * .015 - dissolve * .025)
  const pitch = .20, yaw = -.10 + p * .15, roll = -.035 + p * .05
  const cy = Math.cos(yaw), syaw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll)
  const project = (x: number, y: number, z: number): Point => {
    const rx = x * cy + z * syaw, rz = z * cy - x * syaw
    const py = y * cp - rz * sp, depth = y * sp + rz * cp
    const perspective = 5 / (5 - depth), px = rx * scale * perspective, sy = py * scale * perspective
    return { x: width / 2 + px * cr - sy * sr, y: centerY + px * sr + sy * cr }
  }
  const leaf = (u: number, v: number, angle: number, layer = 0, bend = 0) => project(Math.cos(angle) * u * 1.13, (v - .5) * 1.5, Math.sin(angle) * u * 1.13 + Math.sin(u * Math.PI) * bend + layer)
  const path = (points: Point[], close = false) => { ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); if (close) ctx.closePath() }
  const stroke = (points: Point[], color: string, alpha: number, thickness = 1, bloom = 0) => {
    path(points); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = thickness; ctx.shadowColor = color; ctx.shadowBlur = bloom; ctx.stroke(); ctx.shadowBlur = 0
  }
  // Project a text texture onto the curved leaf in thin strips. The back face reads naturally too.
  const lettering = (texture: HTMLCanvasElement, angle: number, layer: number, bend: number, strength: number) => {
    const alpha = opacity * strength * .86 * ease(Math.abs(Math.cos(angle)) / .3)
    if (alpha < .001) return
    const reverse = Math.cos(angle) < 0
    ctx.globalAlpha = alpha
    for (let i = 0; i < 28; i++) {
      const u0 = i / 28, u1 = (i + 1) / 28
      const a = leaf(reverse ? 1 - u0 : u0, 0, angle, layer, bend)
      const b = leaf(reverse ? 1 - u1 : u1, 0, angle, layer, bend)
      const c = leaf(reverse ? 1 - u0 : u0, 1, angle, layer, bend)
      ctx.save()
      ctx.transform((b.x - a.x) / (600 / 28), (b.y - a.y) / (600 / 28), (c.x - a.x) / 800, (c.y - a.y) / 800, a.x, a.y)
      ctx.drawImage(texture, u0 * 600, 0, 600 / 28, 800, 0, 0, 600 / 28 + .25, 800)
      ctx.restore()
    }
  }
  const sheet = (angle: number, color: string, layer: number, bend: number, strength: number, texture?: HTMLCanvasElement, textStrength = 1) => {
    const top = Array.from({ length: 32 }, (_, i) => leaf(i / 31, 0, angle, layer, bend))
    const bottom = Array.from({ length: 32 }, (_, i) => leaf(1 - i / 31, 1, angle, layer, bend))
    const outline = [...top, ...bottom, top[0]]
    const fill = ctx.createLinearGradient(top[0].x, top[0].y, bottom[0].x, bottom[0].y)
    fill.addColorStop(0, color); fill.addColorStop(1, palette.secondary)
    path(outline, true); ctx.fillStyle = fill; ctx.globalAlpha = opacity * strength * (palette.dark ? .09 : .055); ctx.fill()
    stroke(outline, color, opacity * strength * .75, 1.1, palette.dark ? 8 : 3)
    if (texture) lettering(texture, angle, layer, bend, strength * textStrength)
  }
  const left = .14 + opening * (Math.PI - .22), right = .065
  // Stacked contours create a complete floating book, rather than a single page wipe.
  for (const angle of [left, right]) {
    for (let i = 4; i >= 1; i--) {
      const points = [leaf(0, 1, angle, -i * .013), leaf(1.015, 1, angle, -i * .013), leaf(1.015, 0, angle, -i * .013)]
      stroke(points, palette.secondary, opacity * .22, .7)
    }
    sheet(angle, angle === left ? palette.secondary : palette.primary, 0, .035, .85, textures?.[angle === left ? 0 : 1], angle === left ? 1 : ease((turning - .45) / .15))
  }
  if (turning > .01 && turning < .99) {
    for (let i = 3; i >= 1; i--) {
      const angle = .07 + ease((p - .18 - i * .04) / .5) * (Math.PI - .14)
      sheet(angle, i % 2 ? palette.primary : palette.secondary, .02 + i * .007, Math.sin(angle) * .3, .12 + i * .05)
    }
  }
  const angle = .07 + turning * (Math.PI - .14), bend = Math.sin(angle) * .35
  // Hand the excerpt from the turning leaf to the revealed page, avoiding doubled translucent text.
  sheet(angle, palette.primary, .05, bend, 1, turning < .5 ? textures?.[1] : undefined, 1 - ease((turning - .4) / .1))
  const edge = Array.from({ length: 40 }, (_, i) => leaf(1, i / 39, angle, .05, bend))
  stroke(edge, palette.primary, opacity * .9, 1.8, palette.dark ? 16 : 5)
  stroke([leaf(0, 0, 0, .08), leaf(0, 1, 0, .08)], palette.primary, opacity * .65, 1.4, 8)
  // Leaves disintegrate into drifting sparks across the screen during the slow dissolve.
  const energy = Math.sin(turning * Math.PI) * .5 + Math.sin(dissolve * Math.PI)
  for (let i = 0; i < 110; i++) {
    const u = (i * .618) % 1, v = (i * .381) % 1, age = (p * 1.4 + i * .137) % 1
    const origin = leaf(u, v, i % 2 ? angle : left, .08, bend)
    const drift = dissolve * (width * .2 + scale * .4) + age * 15
    const x = origin.x + Math.sin(i * 2.4) * drift, y = origin.y - dissolve * (height * .25 + v * scale * .4) - age * 20
    ctx.globalAlpha = materialize * energy * (1 - dissolve) * (.25 + (1 - age) * .45)
    ctx.fillStyle = i % 3 ? palette.primary : palette.secondary
    const size = i % 9 ? 1.3 : 2.6; ctx.fillRect(x, y, size, size)
  }
  ctx.globalAlpha = 1
}
