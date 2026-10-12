export type JourneyPalette = { primary: string; secondary: string; text: string; surface: string; dark: boolean }
type Point = { x: number; y: number; z: number }

/** A directional ribbon terrain: chapters are checkpoints along one continuous route. */
export function drawTopicJourney(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, count: number, selected: number, pointer: { x: number; y: number }, palette: JourneyPalette) {
  ctx.clearRect(0, 0, width, height)
  const compact = width < 600
  const scaleX = width / 8.1, scaleY = height / 3.5
  const angle = -.12 + Math.sin(time * .22) * .035 + pointer.x * .045
  const project = (p: Point) => {
    const x = p.x * Math.cos(angle) - p.z * Math.sin(angle)
    const z = p.x * Math.sin(angle) + p.z * Math.cos(angle)
    const depth = 1 + z * .055
    return { x: width / 2 + x * scaleX * depth, y: height * .59 + (z * .42 - p.y * .92) * scaleY + pointer.y * 3 }
  }
  const route = (u: number, lane = 0): Point => ({ x: (u - .5) * 6.5, y: .55 + Math.sin(u * Math.PI * 2 - .7) * .5 + Math.sin(time * .75 + u * 7) * .12, z: Math.sin(u * Math.PI * 2 + .9) * .75 + lane })
  const line = (points: Point[], color: string, alpha: number, thickness = 1) => {
    ctx.beginPath(); points.forEach((p, i) => { const v = project(p); if (i) ctx.lineTo(v.x, v.y); else ctx.moveTo(v.x, v.y) })
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = thickness; ctx.stroke()
  }
  // Receding engineering terrain, with no orbit or repeated stacked cards.
  for (let i = -7; i <= 7; i++) {
    line([{ x: i * .5, y: 0, z: -2 }, { x: i * .5, y: 0, z: 2 }], palette.text, palette.dark ? .08 : .1)
    line([{ x: -3.5, y: 0, z: i * .28 }, { x: 3.5, y: 0, z: i * .28 }], palette.text, palette.dark ? .08 : .1)
  }
  // A translucent curved ribbon surface and its raised contour rails.
  const steps = 110
  const edges = Array.from({ length: steps + 1 }, (_, i) => route(i / steps, -.42))
  const other = Array.from({ length: steps + 1 }, (_, i) => route(1 - i / steps, .42))
  ctx.beginPath(); [...edges, ...other].forEach((p, i) => { const v = project(p); if (i) ctx.lineTo(v.x, v.y); else ctx.moveTo(v.x, v.y) }); ctx.closePath()
  const fill = ctx.createLinearGradient(width * .15, 0, width * .85, 0)
  fill.addColorStop(0, palette.primary); fill.addColorStop(1, palette.secondary)
  ctx.fillStyle = fill; ctx.globalAlpha = palette.dark ? .22 : .14; ctx.fill()
  for (let lane = -4; lane <= 4; lane++) {
    const points = Array.from({ length: steps + 1 }, (_, i) => route(i / steps, lane * .105))
    line(points, lane < 0 ? palette.primary : palette.secondary, lane === -4 || lane === 4 ? .65 : .2, lane === 0 ? 1.5 : 1)
  }
  // Cross sections expose the ribbon's geometry as a moving topographic mesh.
  for (let rib = 0; rib <= 42; rib++) {
    const u = rib / 42
    const points = Array.from({ length: 9 }, (_, j) => {
      const p = route(u, (j - 4) * .105)
      p.y += Math.sin(j / 8 * Math.PI) * .13
      return p
    })
    line(points, u < .5 ? palette.primary : palette.secondary, palette.dark ? .3 : .22)
    if (rib % 7 === 0) {
      const p = route(u, .42)
      line([p, { ...p, y: 0 }], palette.primary, .13)
    }
  }
  // Floating direction glyphs stay attached to the ribbon.
  for (let arrow = 0; arrow < 4; arrow++) {
    const u = .1 + arrow * .24
    const p = route(u); p.y += .08
    line([{ ...p, x: p.x - .07, z: p.z - .08 }, { ...p, x: p.x + .06 }, { ...p, x: p.x - .07, z: p.z + .08 }], palette.secondary, .7, 1.3)
  }
  for (let strand = 0; strand < 2; strand++) {
    const phase = time * .65 + strand * Math.PI
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const p = route(i / steps)
      p.y += Math.sin(i / steps * 12 + phase) * .16
      p.z += Math.cos(i / steps * 12 + phase) * .32
      return p
    })
    line(points, strand ? palette.secondary : palette.primary, .75, 1.4)
  }
  // Short light trains carry motion along the route rather than washing over text.
  for (let packet = 0; packet < 6; packet++) {
    const head = (time * .075 + packet / 6) % 1
    for (let tail = 0; tail < 16; tail++) {
      const u = head - tail * .003
      if (u < 0) continue
      const a = route(u, packet % 2 ? -.19 : .19), b = route(Math.min(1, u + .003), packet % 2 ? -.19 : .19)
      line([a, b], packet % 2 ? palette.primary : palette.secondary, (1 - tail / 16) * .95, tail === 0 ? 3 : 2)
    }
  }
  // The chapter markers use the real chapter count (capped only in the decorative scene).
  const visibleCount = Math.min(Math.max(count, 1), 7)
  for (let i = 0; i < visibleCount; i++) {
    const u = visibleCount === 1 ? .5 : .13 + i / (visibleCount - 1) * .74
    const base = route(u), active = i === selected
    const lift = .48 + (active ? .16 : 0) + Math.sin(time * 1.1 + i) * .045
    const color = i % 2 ? palette.secondary : palette.primary
    const floor = project({ ...base, y: 0 })
    const peak = project({ ...base, y: base.y + lift })
    line([{ ...base, y: 0 }, { ...base, y: base.y + lift }], color, active ? .8 : .3)
    // A narrow prism gives each checkpoint a visible vertical dimension.
    const tip = { ...base, y: base.y + lift }
    const face = [tip, { ...base, x: base.x - .055 }, { ...base, z: base.z + .085 }, tip]
    ctx.beginPath(); face.forEach((p, j) => { const v = project(p); if (j) ctx.lineTo(v.x, v.y); else ctx.moveTo(v.x, v.y) }); ctx.closePath()
    ctx.fillStyle = color; ctx.globalAlpha = active ? .3 : .13; ctx.fill(); ctx.globalAlpha = .45; ctx.lineWidth = 1; ctx.strokeStyle = color; ctx.stroke()
    // A faceted beacon, not another floating panel.
    const diamond = [{ ...base, x: base.x - .14, y: base.y + lift }, { ...base, z: base.z - .14, y: base.y + lift }, { ...base, x: base.x + .14, y: base.y + lift }, { ...base, z: base.z + .14, y: base.y + lift }]
    ctx.beginPath(); diamond.forEach((p, j) => { const v = project(p); if (j) ctx.lineTo(v.x, v.y); else ctx.moveTo(v.x, v.y) }); ctx.closePath()
    ctx.globalAlpha = 1; ctx.fillStyle = palette.surface; ctx.fill(); ctx.globalAlpha = active ? 1 : .7; ctx.strokeStyle = color; ctx.lineWidth = active ? 1.7 : 1; ctx.stroke()
    ctx.beginPath(); ctx.arc(peak.x, peak.y, active ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
    ctx.globalAlpha = .45; ctx.fillRect(floor.x - 7, floor.y + 6, 14, 1)
    ctx.globalAlpha = .85; ctx.font = `${compact ? 9 : 11}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(String(i + 1).padStart(2, '0'), peak.x, peak.y - 20)
  }
  ctx.globalAlpha = 1
}
