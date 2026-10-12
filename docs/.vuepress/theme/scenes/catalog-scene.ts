export type CatalogSceneKind = 'topics' | 'writing'
export type CatalogScenePalette = { primary: string; secondary: string; surface: string; text: string; dark: boolean }
type Vec = { x: number; y: number; z: number }
type Face = { points: Vec[]; color: string; tint: number }

/** Depth-sorted faceted sculptures. Shared projection, separate geometry for each catalog. */
export function drawCatalogScene(ctx: CanvasRenderingContext2D, width: number, height: number, kind: CatalogSceneKind, time: number, pointer: { x: number; y: number }, palette: CatalogScenePalette) {
  ctx.clearRect(0, 0, width, height)
  const scale = Math.min(width / 3.6, height / 3.7)
  const yaw = (kind === 'topics' ? .55 + time * .13 : -.32 + Math.sin(time * .25) * .07) + pointer.x * .1
  const pitch = (kind === 'topics' ? .2 : .62) + pointer.y * .06
  const transform = (v: Vec) => {
    const x = v.x * Math.cos(yaw) + v.z * Math.sin(yaw), z = v.z * Math.cos(yaw) - v.x * Math.sin(yaw)
    return { x, y: v.y * Math.cos(pitch) - z * Math.sin(pitch), z: v.y * Math.sin(pitch) + z * Math.cos(pitch) }
  }
  const project = (v: Vec) => {
    const p = transform(v), depth = 5 / (5 + p.z)
    return { x: width / 2 + p.x * scale * depth, y: height * .5 - p.y * scale * depth, z: p.z }
  }
  const path = (points: Vec[], close = false) => {
    ctx.beginPath(); points.forEach((p, i) => { const v = project(p); if (i) ctx.lineTo(v.x, v.y); else ctx.moveTo(v.x, v.y) }); if (close) ctx.closePath()
  }
  const line = (points: Vec[], color: string, alpha = .5, thickness = 1) => { path(points); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.stroke() }
  const dot = (p: Vec, color: string, radius = 2.5, alpha = 1) => { const v = project(p); ctx.beginPath(); ctx.arc(v.x, v.y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fill() }
  const faces: Face[] = []
  const face = (points: Vec[], color: string, tint: number) => faces.push({ points, color, tint })
  const paintFaces = () => {
    faces.sort((a, b) => b.points.reduce((sum, p) => sum + transform(p).z, 0) / b.points.length - a.points.reduce((sum, p) => sum + transform(p).z, 0) / a.points.length)
    for (const f of faces) {
      const top = project(f.points[0]), bottom = project(f.points.at(-1)!)
      const fill = ctx.createLinearGradient(top.x, top.y, bottom.x + 25, bottom.y + 40)
      fill.addColorStop(0, palette.surface); fill.addColorStop(.55, f.color); fill.addColorStop(1, palette.surface)
      path(f.points, true); ctx.fillStyle = palette.surface; ctx.globalAlpha = kind === 'writing' ? .95 : palette.dark ? .65 : .88; ctx.fill()
      ctx.fillStyle = fill; ctx.globalAlpha = f.tint; ctx.fill()
      if (kind === 'topics') { ctx.strokeStyle = f.color; ctx.lineWidth = .8; ctx.globalAlpha = palette.dark ? .6 : .5; ctx.stroke() }
    }
  }
  // A restrained base gives the object depth without a framed dark panel in light mode.
  const baseY = kind === 'topics' ? -1.5 : -.7
  for (let i = -4; i <= 4; i++) {
    line([{ x: i * .38, y: baseY, z: -1.4 }, { x: i * .38, y: baseY, z: 1.4 }], palette.text, .09)
    line([{ x: -1.5, y: baseY, z: i * .35 }, { x: 1.5, y: baseY, z: i * .35 }], palette.text, .09)
  }
  if (kind === 'topics') {
    const levels = 7
    const edge = (u: number, side: number, offset = 0): Vec => {
      const y = (u - .5) * 2.3, radius = .62 + Math.sin(u * Math.PI) * .18 + offset
      const angle = side * Math.PI * 2 / 3 + y * .7 + Math.sin(time * .5) * .08
      return { x: Math.cos(angle) * radius, y: y + Math.sin(time * .8) * .045, z: Math.sin(angle) * radius }
    }
    // The connected folded shell has solid shaded facets, rather than a wire landscape.
    for (let level = 0; level < levels; level++) {
      const a = level / levels, b = (level + 1) / levels
      for (let side = 0; side < 3; side++) {
        const color = side === 1 ? palette.secondary : palette.primary
        const p = edge(a, side), q = edge(a, side + 1), r = edge(b, side + 1), s = edge(b, side)
        face([p, q, s], color, .32 + side * .08)
        face([q, r, s], color, .5 + (level % 2) * .12)
      }
    }
    // Three detached folded fins open and close around the core.
    for (let side = 0; side < 3; side++) {
      const spread = .22 + (Math.sin(time * .8 + side * .6) + 1) * .1
      face([edge(.2, side, spread), edge(.5, side, spread + .18), edge(.8, side, spread), edge(.5, side, spread - .06)], side === 1 ? palette.secondary : palette.primary, .48)
    }
    paintFaces()
    for (let side = 0; side < 3; side++) {
      const points = Array.from({ length: 40 }, (_, i) => edge(i / 39, side))
      line(points, side === 1 ? palette.secondary : palette.primary, .85, 1.3)
      for (let packet = 0; packet < 2; packet++) {
        const u = (time * .12 + packet * .5 + side * .15) % 1
        for (let trail = 0; trail < 10; trail++) {
          if (u - trail * .009 < 0) continue
          dot(edge(u - trail * .009, side), side === 1 ? palette.secondary : palette.primary, trail ? 1.3 : 3, (1 - trail / 10) * .85)
        }
      }
      const tip = edge(side === 1 ? .9 : .2, side, .42)
      const outer = { ...tip, x: tip.x * 1.35, z: tip.z * 1.35 }
      line([tip, outer], palette.text, .3); dot(tip, palette.primary, 2)
    }
  } else {
    const page = (u: number, v: number, angle: number, layer = 0): Vec => ({ x: Math.cos(angle) * u * 1.3, y: Math.sin(angle) * u * 1.3 + Math.sin(u * Math.PI) * .07 + layer, z: (v - .5) * 1.75 })
    const sheet = (angle: number, color: string, layer: number, tint: number) => {
      for (let segment = 0; segment < 10; segment++) {
        const u = segment / 10, next = (segment + 1) / 10
        face([page(u, 0, angle, layer), page(next, 0, angle, layer), page(next, 1, angle, layer), page(u, 1, angle, layer)], color, tint)
      }
    }
    const right = .15, left = Math.PI - .15
    sheet(left, palette.primary, -.065, .45); sheet(right, palette.primary, -.065, .45)
    sheet(left, palette.secondary, 0, .19); sheet(right, palette.primary, .005, .21)
    // The leaf turns slowly through the spine and settles before the next turn.
    const phase = (time % 10) / 10
    const turn = Math.min(1, Math.max(0, (phase - .18) / .62))
    const ease = turn * turn * (3 - 2 * turn)
    const flipping = .17 + ease * (Math.PI - .34)
    sheet(flipping, palette.secondary, .035, .36)
    paintFaces()
    line([{ x: 0, y: .04, z: -.88 }, { x: 0, y: .04, z: .88 }], palette.primary, .85, 1.5)
    for (const angle of [left, right, flipping]) {
      const layer = angle === flipping ? .04 : .015
      const outline = [...Array.from({ length: 18 }, (_, i) => page(i / 17, 0, angle, layer)), page(1, 1, angle, layer), ...Array.from({ length: 18 }, (_, i) => page(1 - i / 17, 1, angle, layer))]
      line(outline, angle === flipping ? palette.secondary : palette.primary, .75, 1.1)
      for (let row = 0; row < 7; row++) {
        const v = .17 + row * .105, end = row === 0 ? .6 : row === 6 ? .7 : .87
        const points = Array.from({ length: 14 }, (_, i) => page(.16 + i / 13 * (end - .16), v, angle, angle === flipping ? .04 : .015))
        line(points, row === 0 ? palette.primary : palette.text, row === 0 ? .75 : .33, row === 0 ? 1.6 : .8)
      }
    }
    // A hovering pen nib writes a short luminous stroke on the right page.
    const stroke = (time * .16) % 1
    const nib = page(.2 + stroke * .62, .73, right, .1)
    for (let tail = 0; tail < 18; tail++) {
      const u = stroke - tail * .015
      if (u < 0) continue
      dot(page(.2 + u * .62, .73, right, .023), palette.primary, 1.4, 1 - tail / 18)
    }
    const peak = { ...nib, x: nib.x + .22, y: nib.y + .48, z: nib.z - .1 }
    const points = [nib, { ...peak, z: peak.z - .07 }, { ...peak, x: peak.x + .08 }, { ...peak, z: peak.z + .07 }]
    path(points, true); ctx.globalAlpha = .85; ctx.fillStyle = palette.surface; ctx.fill(); ctx.strokeStyle = palette.primary; ctx.lineWidth = 1.2; ctx.stroke()
    line([nib, peak], palette.secondary, .85); dot(nib, palette.secondary, 2.3)
    // Detached ink fragments drift away, with no mock article titles or counts.
    for (let i = 0; i < 10; i++) {
      const u = (time * .05 + i / 10) % 1
      const p = { x: Math.sin(i * 2.1) * (1 + u * .35), y: .2 + u * 1.2, z: Math.cos(i * 2.1) * .8 }
      line([p, { ...p, x: p.x + .08 }], i % 2 ? palette.primary : palette.secondary, Math.sin(u * Math.PI) * .55)
    }
  }
  ctx.globalAlpha = 1
}
