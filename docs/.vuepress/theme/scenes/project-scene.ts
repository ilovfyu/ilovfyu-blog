export type SceneKind = 'cache' | 'agent' | 'annotation'
export type ScenePalette = { accent: string; secondary: string; text: string; dark: boolean }
type V = [number, number, number]
type P = { x: number; y: number; z: number }
const TAU = Math.PI * 2
const phi = (1 + Math.sqrt(5)) / 2
const ico: V[] = [[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]]
const faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]]

/** A small, deterministic 3D scene projected onto a 2D canvas; no WebGL/runtime dependency. */
export function drawProjectScene(ctx: CanvasRenderingContext2D, w: number, h: number, kind: SceneKind, t: number, pointer: { x: number; y: number }, palette: ScenePalette) {
  ctx.clearRect(0, 0, w, h)
  const { accent, secondary, text, dark } = palette
  const scale = Math.min(w / 440, h / 265)
  const yaw = (kind === 'agent' ? t * .09 : kind === 'cache' ? -.65 + Math.sin(t * .18) * .23 : -.48 + Math.sin(t * .23) * .15) + pointer.x * .24
  const pitch = (kind === 'cache' ? -.58 : kind === 'agent' ? .28 : -.10) + pointer.y * .13
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch)
  const project = ([x, y, z]: V): P => {
    const a = x * cy + z * sy, b = z * cy - x * sy
    const c = y * cx - b * sx, d = y * sx + b * cx
    const depth = 350 / (350 + d)
    return { x: w / 2 + a * depth * scale + pointer.x * 5, y: h / 2 + c * depth * scale + 8, z: d }
  }
  function shape(vertices: V[], color = accent, alpha = .45, width = 1, fill = 0, closed = false) {
    const points = vertices.map(project)
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))
    if (closed) ctx.closePath()
    if (fill) { ctx.globalAlpha = fill; ctx.fillStyle = color; ctx.fill() }
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); ctx.globalAlpha = 1
  }
  function point(v: V, color = accent, radius = 2, alpha = 1, halo = true) {
    const p = project(v)
    if (halo && dark) { ctx.globalAlpha = alpha * .10; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x,p.y,radius * 4,0,TAU); ctx.fill() }
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x,p.y,radius,0,TAU); ctx.fill(); ctx.globalAlpha = 1
  }
  function label(v: V, value: string, color = accent, size = 9, fixed = false) {
    const p = fixed ? { x: w / 2 + v[0] * scale, y: h / 2 + v[1] * scale + 8 } : project(v); ctx.globalAlpha = .85; ctx.fillStyle = color
    ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`; ctx.textAlign = 'center'; ctx.fillText(value,p.x,p.y); ctx.globalAlpha = 1
  }
  function ring(radius: number, y: number, tilt = 0, color = accent, speed = 1) {
    const path = (a: number): V => [Math.cos(a) * radius, y + Math.sin(a) * radius * tilt, Math.sin(a) * radius]
    shape(Array.from({length:97},(_,i)=>path(i/96*TAU)),color,.19)
    for (let n = 0; n < 3; n++) {
      const a = t * speed * .55 + n * TAU / 3
      shape(Array.from({length:13},(_,i)=>path(a - .30 + i * .025)),color,.7,1.4)
      point(path(a),color,2.5,.95)
    }
  }
  function cube(center: V, size: number, color = accent, alpha = .65) {
    const vertices: V[] = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v => [v[0]*size+center[0],v[1]*size+center[1],v[2]*size+center[2]] as V)
    const sides = [[0,1,2,3],[4,5,6,7],[0,4,5,1],[2,6,7,3],[1,5,6,2],[0,4,7,3]]
    sides.map(side=>({side,depth:side.reduce((sum,i)=>sum+project(vertices[i]).z,0)/4})).sort((a,b)=>b.depth-a.depth).forEach(({side},i)=>shape(side.map(index=>vertices[index]),color,alpha,1,dark ? .11 + i*.035 : .045 + i*.016,true))
  }
  function mesh(radius: number, center: V = [0,0,0], color = accent, alpha = .45) {
    const vertices: V[] = ico.map(v=>[v[0]*radius+center[0],v[1]*radius+center[1],v[2]*radius+center[2]])
    faces.map(face=>({face,depth:face.reduce((sum,i)=>sum+project(vertices[i]).z,0)/3})).sort((a,b)=>b.depth-a.depth).forEach(({face},i)=>shape(face.map(index=>vertices[index]),i%7===0?secondary:color,alpha,1,dark ? .07 + (i%5)*.035 : .045 + (i%5)*.016,true))
    vertices.forEach(v=>point(v,color,1.5,.8,false))
  }
  // Dust flows through the depth field, without the large pointer bloom used by the old theme.
  for (let i = 0; i < 45; i++) {
    const x = Math.sin(i * 38.37) * 225
    const y = Math.cos(i * 17.81) * 112
    const z = ((i * 31 + t * 9) % 220) - 110
    point([x,y,z],i % 9 === 0 ? secondary : accent,i % 7 === 0 ? 1.5 : .8,.16 + (i % 5)*.055,false)
  }

  if (kind === 'cache') {
    ring(145, 8, .10, accent, 1)
    const levels = [-53,-3,47]
    // Four-by-four cache pages suspended at separate depths.
    levels.forEach((y, layer) => {
      const drift = Math.sin(t * .9 + layer) * 4
      const yy = y + drift
      const plane: V[] = [[-70,yy,-70],[70,yy,-70],[70,yy,70],[-70,yy,70]]
      const color = layer===1 ? secondary : accent
      // Side faces give each cache page a physical thickness rather than a flat wireframe.
      shape([plane[2],plane[3],[-70,yy+8,70],[70,yy+8,70]],color,.5,1,dark ? .23 : .12,true)
      shape([plane[1],plane[2],[70,yy+8,70],[70,yy+8,-70]],color,.5,1,dark ? .17 : .08,true)
      shape(plane,color,.8,1.2,dark ? .13 : .075,true)
      for (let n = 1; n < 4; n++) {
        shape([[-70+n*35,yy,-70],[-70+n*35,yy,70]],accent,.25)
        shape([[-70,yy,-70+n*35],[70,yy,-70+n*35]],accent,.25)
      }
      for (let n = 0; n < 4; n++) {
        const active = layer === 1 && n === Math.floor(t/2)%4
        cube([-48+n*32,yy-9,layer===1 ? -34 : 32],7,active ? secondary : accent,.65)
      }
      shape([[-78,yy,-78],[-78,yy-8,-78],[-70,yy-8,-78]],secondary,.75,1.5)
    })
    shape([[0,-65,0],[0,68,0]],accent,.3)
    for (let i = 0; i < 5; i++) point([0,65-((t*23+i*25)%130),0],accent,2,.9)
    label([-133,-65,0],'PREFIX')
    label([125,13,15],'SKILLS',secondary)
    label([0,99,0],'KV / MEMORY',text)
  } else if (kind === 'agent') {
    ring(153,0,.18,accent,1.2)
    ring(113,0,.8,secondary,-.75)
    mesh(36,[0,0,0],accent,.65)
    // A nested core and travelling packets make the network's depth legible in motion.
    cube([0,0,0],10,secondary,.8)
    for (let i = 0; i < 6; i++) {
      const angle = i*TAU/6 + t*.22
      const node: V = [Math.cos(angle)*147,Math.sin(angle*2+t*.3)*48,Math.sin(angle)*147]
      shape([[0,0,0],node],i%2 ? secondary : accent,.25)
      cube(node,6,i%2 ? secondary : accent,.75)
      const k = (t*.3+i/6)%1
      point(node.map(v=>v*k) as V,i%2 ? secondary : accent,2.2,.9)
    }
    label([0,-85,0],'COMPOSE',text)
    label([-175,38,0],'BUILD',accent,9,true)
    label([175,38,0],'DELIVER',secondary,9,true)
  } else {
    // Three glass planes, an object point cloud and a moving inspection band.
    const plane = (z: number): V[] => [[-102,-77,z],[102,-77,z],[102,77,z],[-102,77,z]]
    ;[45,0,-45].forEach((z,i)=> {
      shape(plane(z),i===1 ? secondary : accent,.35 + i*.15,1,dark ? .045 : .02,true)
      if (i===0) for (let n = 1; n < 7; n++) shape([[-102,-77+n*22,z],[102,-77+n*22,z]],accent,.14)
    })
    for (let lat = 1; lat < 10; lat++) {
      for (let lon = 0; lon < 22; lon++) {
        const a = lon/22*TAU+t*.13, b = lat/10*Math.PI
        point([Math.cos(a)*Math.sin(b)*48,Math.cos(b)*56,Math.sin(a)*Math.sin(b)*48],lat%3===0 ? secondary : accent,1.25,.6,false)
      }
    }
    const z = -57, scan = Math.sin(t*.85)*62
    shape([[-92,scan-8,z],[92,scan-8,z],[92,scan+8,z],[-92,scan+8,z]],accent,0,0,dark ? .13 : .06,true)
    shape([[-92,scan,z],[92,scan,z]],accent,.95,1.6)
    const corners: V[][] = [ [[-59,-65,z],[-72,-65,z],[-72,-52,z]], [[59,-65,z],[72,-65,z],[72,-52,z]], [[-72,52,z],[-72,65,z],[-59,65,z]], [[72,52,z],[72,65,z],[59,65,z]] ]
    corners.forEach(corner=>shape(corner,secondary,.95,1.8))
    point([-72,scan,z],accent,2.5)
    point([72,scan,z],accent,2.5)
    ring(147,82,.06,accent,-.65)
    label([-157,-50,0],'DATA')
    label([148,0,0],'LABEL',secondary)
    label([0,110,0],'QUALITY / REVIEW',text)
  }
  ctx.globalAlpha = 1
}
