export type BookPalette = { primary: string; secondary: string; dark: boolean }
type Point = { x: number; y: number }
const clamp = (value: number) => Math.min(1, Math.max(0, value))
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }

/** A spectral book made of translucent leaves and luminous contours, never opaque paper. */
export function drawArticleBook(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, palette: BookPalette) {
  ctx.clearRect(0, 0, width, height)
  const p = clamp(progress), opening = ease(p / .3), turning = ease((p - .18) / .5)
  const dissolve = ease((p - .64) / .36), materialize = ease(p / .16), opacity = materialize * (1 - dissolve)
  const scale = Math.min(width * .39, height * .33, 470) * (.8 + opening * .2 + dissolve * .12)
  const centerY = height * (.54 - opening * .035 - dissolve * .04)
  const pitch = .28, yaw = -.15 + p * .22, roll = -.065 + p * .09
  const project = (x: number, y: number, z: number): Point => {
    const rx = x * Math.cos(yaw) + z * Math.sin(yaw), rz = z * Math.cos(yaw) - x * Math.sin(yaw)
    const py = y * Math.cos(pitch) - rz * Math.sin(pitch), depth = y * Math.sin(pitch) + rz * Math.cos(pitch)
    const perspective = 5 / (5 - depth), px = rx * scale * perspective, sy = py * scale * perspective
    return { x: width / 2 + px * Math.cos(roll) - sy * Math.sin(roll), y: centerY + px * Math.sin(roll) + sy * Math.cos(roll) }
  }
  const leaf = (u: number, v: number, angle: number, layer = 0, bend = 0) => project(Math.cos(angle) * u * 1.13, (v - .5) * 1.5, Math.sin(angle) * u * 1.13 + Math.sin(u * Math.PI) * bend + layer)
  const path = (points: Point[], close = false) => { ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); if (close) ctx.closePath() }
  const stroke = (points: Point[], color: string, alpha: number, thickness = 1, bloom = 0) => {
    path(points); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = thickness; ctx.shadowColor = color; ctx.shadowBlur = bloom; ctx.stroke(); ctx.shadowBlur = 0
  }
  const sheet = (angle: number, color: string, layer: number, bend: number, strength: number, glyphs = true) => {
    const top = Array.from({ length: 32 }, (_, i) => leaf(i / 31, 0, angle, layer, bend))
    const bottom = Array.from({ length: 32 }, (_, i) => leaf(1 - i / 31, 1, angle, layer, bend))
    const outline = [...top, ...bottom, top[0]]
    const fill = ctx.createLinearGradient(top[0].x, top[0].y, bottom[0].x, bottom[0].y)
    fill.addColorStop(0, color); fill.addColorStop(1, palette.secondary)
    path(outline, true); ctx.fillStyle = fill; ctx.globalAlpha = opacity * strength * (palette.dark ? .09 : .055); ctx.fill()
    stroke(outline, color, opacity * strength * .75, 1.1, palette.dark ? 8 : 3)
    if (glyphs) {
      for (let row = 0; row < 9; row++) {
        const v = .16 + row * .078, end = row % 4 === 0 ? .62 : .85
        const points = Array.from({ length: 14 }, (_, i) => leaf(.14 + i / 13 * (end - .14), v, angle, layer, bend))
        stroke(points, color, opacity * strength * (row === 0 ? .4 : .13), row === 0 ? 2 : .8)
      }
    }
  }
  const left = .14 + opening * (Math.PI - .22), right = .065
  // Stacked contours create a complete floating book, rather than a single page wipe.
  for (const angle of [left, right]) {
    for (let i = 4; i >= 1; i--) {
      const points = [leaf(0, 1, angle, -i * .013), leaf(1.015, 1, angle, -i * .013), leaf(1.015, 0, angle, -i * .013)]
      stroke(points, palette.secondary, opacity * .22, .7)
    }
    sheet(angle, angle === left ? palette.secondary : palette.primary, 0, .035, .85)
  }
  if (turning > .01 && turning < .99) {
    for (let i = 3; i >= 1; i--) {
      const angle = .07 + ease((p - .18 - i * .04) / .5) * (Math.PI - .14)
      sheet(angle, i % 2 ? palette.primary : palette.secondary, .02 + i * .007, Math.sin(angle) * .3, .2 + i * .08, false)
    }
  }
  const angle = .07 + turning * (Math.PI - .14), bend = Math.sin(angle) * .35
  sheet(angle, palette.primary, .05, bend, 1)
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
