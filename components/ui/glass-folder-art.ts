export type ArtPreset = "aurora" | "ember" | "dusk" | "glacier" | "verdant"
export type ArtRecipe = {
  style: "marble" | "streak"
  colors: string[]
  scale?: number
  warp?: number
  angle?: number
  gloss?: number
  veins?: number
}
export type FolderArt = ArtPreset | ArtRecipe | "none"
export const ART_PRESETS: Record<ArtPreset, ArtRecipe> = {
  aurora: {style: "streak", colors: ["#f4efe9", "#e9c2b8", "#c2433f", "#2a1e2a", "#22395e", "#6f97c2", "#e5edf4"], scale: .7, warp: 1.4, angle: -.62, gloss: .18, veins: 0},
  ember: {style: "marble", colors: ["#07090c", "#16252c", "#3d5f68", "#1a1416", "#a3201a", "#ef4a2b", "#ff8a5c"], scale: .62, warp: 3.2, angle: -.5, gloss: .55, veins: .6},
  dusk: {style: "marble", colors: ["#120c18", "#3e2850", "#8f6c9c", "#2b1a24", "#b3502f", "#eab08a", "#fbe7d2"], scale: .75, warp: 3.6, angle: .8, gloss: .5, veins: .5},
  glacier: {style: "streak", colors: ["#f7f8fa", "#d9e2ea", "#9fb4c7", "#e8edf2", "#bccbd8", "#ffffff"], scale: .7, warp: 1.6, angle: .35, gloss: .25, veins: 0},
  verdant: {style: "marble", colors: ["#070b08", "#173024", "#4f7a5a", "#141812", "#a7843a", "#e9cf87", "#fbf3d6"], scale: .7, warp: 3.4, angle: 2.1, gloss: .5, veins: .5},
}
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
function makeFbm(seed: number) {
  const r = rng(seed), perm = new Uint8Array(512), grad = new Float32Array(512)
  const p = Array.from({length: 256}, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  for (let i = 0; i < 256; i++) {
    const a = r() * Math.PI * 2
    grad[i * 2] = Math.cos(a); grad[i * 2 + 1] = Math.sin(a)
  }
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    const X = xi & 255, Y = yi & 255
    const h00 = perm[X + perm[Y]] * 2, h10 = perm[X + 1 + perm[Y]] * 2
    const h01 = perm[X + perm[Y + 1]] * 2, h11 = perm[X + 1 + perm[Y + 1]] * 2
    const d00 = grad[h00] * xf + grad[h00 + 1] * yf
    const d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf
    const d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1)
    const d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1)
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
    return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00))
  }
  return (x: number, y: number, octaves: number) => {
    let sum = 0, amp = .5
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise(x, y)
      const nx = 1.6 * x + 1.2 * y + 7.1
      y = -1.2 * x + 1.6 * y + 3.3; x = nx; amp *= .5
    }
    return sum
  }
}
export type ArtJob = {width: number; height: number; pixels: Uint8ClampedArray; step: (rows: number) => boolean}
export function createArtJob(width: number, height: number, recipe: ArtRecipe, seed: number): ArtJob {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height))
  const colors = recipe.colors.length >= 2 ? recipe.colors : ["#111111", "#eeeeee"]
  const stops = colors.map((c, i) => ({t: i / (colors.length - 1), c: hexToRgb(c)}))
  const scale = recipe.scale ?? .7, warp = recipe.warp ?? 3, gloss = recipe.gloss ?? .4, veins = recipe.veins ?? 0
  const streak = recipe.style === "streak", fbm = makeFbm(seed * 977 + 13), r = rng(seed + 1)
  const ox = r() * 50, oy = r() * 50, angle = (recipe.angle ?? 0) + (r() - .5) * .5
  const ca = Math.cos(angle), sa = Math.sin(angle), m = Math.min(w, h)
  const gw = Math.ceil(w / 2) + 3, gh = Math.ceil(h / 2) + 3
  const G = new Float32Array(gw * gh), GQ = new Float32Array(gw * gh)
  const F = new Float32Array(w * h), Q = new Float32Array(w * h), pixels = new Uint8ClampedArray(w * h * 4)
  let row = 0
  const field = (gy: number) => {
    for (let gx = 0; gx < gw; gx++) {
      const u = ((gx - 1) * 2 - w / 2) / m, v = ((gy - 1) * 2 - h / 2) / m
      let px = (u * ca - v * sa) * scale, py = (u * sa + v * ca) * scale
      if (streak) {px *= .14; py *= 2.2}
      px += ox; py += oy
      const qx = fbm(px, py, 3), qy = fbm(px + 5.2, py + 1.3, 3)
      const rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3)
      const ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3)
      G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4)
      GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy)
    }
  }
  const upsample = () => {
    const cr = (a: number, b: number, c: number, d: number) => (-a + 9 * b + 9 * c - d) / 16
    const T = new Float32Array(w * gh)
    for (let gy = 0; gy < gh; gy++) for (let x = 0; x < w; x++) {
      const r = gy * gw, c = (x >> 1) + 1
      T[gy * w + x] = x & 1 ? cr(G[r + c - 1], G[r + c], G[r + c + 1], G[r + c + 2]) : G[r + c]
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = (y >> 1) + 1
      F[y * w + x] = y & 1 ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x]) : T[c * w + x]
      const gx = (x >> 1) + 1, q0 = GQ[c * gw + gx]
      const qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0
      const q1 = y & 1 ? (x & 1 ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2 : GQ[(c + 1) * gw + gx]) : qx
      Q[y * w + x] = (qx + q1) / 2
    }
  }
  const colorize = () => {
    const sample: number[] = [], stride = Math.max(1, Math.floor(F.length / 4096))
    for (let i = 0; i < F.length; i += stride) sample.push(F[i])
    sample.sort((a, b) => a - b)
    const lo = sample[Math.floor(sample.length * .02)], hi = sample[Math.floor(sample.length * .98)]
    const k = 1 / (hi - lo || 1), lx = -.55, ly = -.65, lz = .52, slope = k * m * .012
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, t = Math.min(1, Math.max(0, (F[i] - lo) * k))
      let j = 1
      while (j < stops.length - 1 && stops[j].t < t) j++
      const a = stops[j - 1], b = stops[j]
      let f = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1)))
      f = f * f * (3 - 2 * f)
      const gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope
      const gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope
      const nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1)
      const spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255
      const silk = 1 + .035 * Math.sin(t * 150 + Q[i] * 24)
      const vein = veins * Math.max(0, 1 - Math.abs(Q[i] - .42) * 14) * .6
      const lit = (.82 + .28 * nd) * silk * (1 - vein)
      for (let channel = 0; channel < 3; channel++) pixels[i * 4 + channel] = (a.c[channel] + (b.c[channel] - a.c[channel]) * f) * lit + spec
      pixels[i * 4 + 3] = 255
    }
  }
  return {width: w, height: h, pixels, step(rows) {
    if (row >= gh) return true
    const end = Math.min(gh, row + Math.max(1, rows))
    while (row < end) field(row++)
    if (row < gh) return false
    upsample(); colorize(); return true
  }}
}
export function fanSlot(index: number, count: number) {
  return count <= 1 ? 0 : index / (count - 1) * 2 - 1
}
