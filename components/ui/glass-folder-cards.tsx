"use client"

import * as React from "react"
import {Ellipsis, Plus} from "lucide-react"
import {ART_PRESETS, createArtJob, fanSlot, hashString, rng, type ArtPreset, type ArtRecipe, type FolderArt, type ArtJob} from "./glass-folder-art"
import "./glass-folder-cards.css"

export {ART_PRESETS, createArtJob, fanSlot, hashString, rng, hexToRgb} from "./glass-folder-art"
export type {ArtPreset, ArtRecipe, FolderArt, ArtJob} from "./glass-folder-art"
export type FolderFile = {name: string; meta?: string; art?: ArtPreset | ArtRecipe; image?: string; href?: string}
export type FolderMenuItem = {label: string; onSelect?: () => void; danger?: boolean}
export type GlassFolderProps = {
  label?: string
  meta?: string
  tone?: "light" | "dark"
  art?: FolderArt
  seed?: number
  image?: string
  files?: FolderFile[]
  action?: "add" | "more" | "none"
  onAdd?: (files: FolderFile[]) => FolderFile | void
  onFilesChange?: (files: FolderFile[]) => void
  menu?: FolderMenuItem[]
  labelPlacement?: "bottom-left" | "top-left" | "top-right"
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onFileSelect?: (file: FolderFile, index: number) => void
  width?: number
  appear?: boolean
  appearDelay?: number
  className?: string
  style?: React.CSSProperties
}

// Optional live art is cached and shared. The portfolio uses prebuilt WebP art
// from the same painter, so visitors never run the noise generator.
const artCache = new Map<string, Promise<HTMLCanvasElement>>()
const queue: {job: ArtJob; priority: number; done: (canvas: HTMLCanvasElement) => void}[] = []
let pumping = false
function pump() {
  if (pumping) return
  pumping = true
  const tick = () => {
    const until = performance.now() + 7
    while (queue.length && performance.now() < until) {
      const head = queue[0]
      if (head.job.step(4)) {
        queue.shift()
        const canvas = document.createElement("canvas")
        canvas.width = head.job.width; canvas.height = head.job.height
        const bytes = new Uint8ClampedArray(head.job.pixels)
        canvas.getContext("2d")?.putImageData(new ImageData(bytes, canvas.width, canvas.height), 0, 0)
        head.done(canvas)
      }
    }
    if (queue.length) requestAnimationFrame(tick)
    else pumping = false
  }
  requestAnimationFrame(tick)
}
function paint(recipe: ArtRecipe, seed: number, w: number, h: number, priority: number) {
  const key = JSON.stringify([recipe, seed, w, h])
  let result = artCache.get(key)
  if (!result) {
    result = new Promise<HTMLCanvasElement>(done => {
      let at = queue.length
      while (at > 1 && queue[at - 1].priority > priority) at--
      queue.splice(at, 0, {job: createArtJob(w, h, recipe, seed), priority, done})
      pump()
    })
    artCache.set(key, result)
  }
  return result
}
function ArtCanvas({art, seed, w, h, density, priority, className}: {
  art: ArtPreset | ArtRecipe; seed: number; w: number; h: number; density: number; priority: number; className?: string
}) {
  const ref = React.useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = React.useState(false)
  const key = JSON.stringify(typeof art === "string" ? ART_PRESETS[art] : art)
  const pw = Math.round(w * density), ph = Math.round(h * density)
  React.useEffect(() => {
    let live = true
    setReady(false)
    paint(JSON.parse(key) as ArtRecipe, seed, pw, ph, priority).then(src => {
      const canvas = ref.current
      if (!live || !canvas) return
      canvas.width = src.width; canvas.height = src.height
      canvas.getContext("2d")?.drawImage(src, 0, 0)
      setReady(true)
    })
    return () => {live = false}
  }, [key, seed, pw, ph, priority])
  return <canvas ref={ref} aria-hidden="true" className={className} data-ready={ready || undefined} style={{width: w, height: h, maxWidth: "none"}} />
}

const W = 340, H = 272, HEADROOM = 54, FRONT_H = 198, SHEET_W = 272, SHEET_H = 184
const BACK_PATH = "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z"
const FRONT_PATH = "M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 176A22 22 0 0 1 318 198L22 198A22 22 0 0 1 0 176Z"
const SAMPLE_FILES: FolderFile[] = [
  {name: "Cover — final", meta: "PNG · 4.8 MB", art: "ember"},
  {name: "Moodboard", meta: "24 images", art: "dusk"},
  {name: "Brief.pdf", meta: "PDF · 1.2 MB"},
]

/** The supplied glass-folder component, with shared CSS and Lucide action icons. */
export default function GlassFolder({
  label = "My Files", meta, tone = "light", art = "aurora", seed = 3, image,
  files: initialFiles = SAMPLE_FILES, action = "add", onAdd, onFilesChange, menu = [],
  labelPlacement = "bottom-left", open: openProp, defaultOpen = false, onOpenChange,
  onFileSelect, width = 340, appear = true, appearDelay = 0, className, style,
}: GlassFolderProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const rootRef = React.useRef<HTMLDivElement>(null)
  const hitRef = React.useRef<HTMLButtonElement>(null)
  const keyRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [files, setFiles] = React.useState(initialFiles)
  const ids = React.useRef(initialFiles.map((_, i) => i)), nextId = React.useRef(initialFiles.length)
  const [dropped, setDropped] = React.useState<number | null>(null), [bump, setBump] = React.useState(0)
  const [openState, setOpenState] = React.useState(defaultOpen), open = openProp ?? openState
  const setOpen = React.useCallback((next: boolean) => {
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }, [openProp, onOpenChange])
  const [menuOpen, setMenuOpen] = React.useState(false), [entered, setEntered] = React.useState(!appear)
  const k = width / W
  const density = Math.min(1.5, Math.max(1, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1)) * k

  React.useEffect(() => {
    if (!appear) return
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {setEntered(true); return}
    let timer = 0
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      timer = window.setTimeout(() => setEntered(true), appearDelay)
    }, {threshold: .25})
    observer.observe(el)
    return () => {observer.disconnect(); window.clearTimeout(timer)}
  }, [appear, appearDelay])

  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const fine = matchMedia("(hover:hover) and (pointer:fine)"), reduced = matchMedia("(prefers-reduced-motion:reduce)")
    let raf = 0, px = 0, py = 0, rect: DOMRect | null = null
    const write = () => {
      raf = 0
      el.style.setProperty("--gf-px", px.toFixed(3)); el.style.setProperty("--gf-py", py.toFixed(3))
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !fine.matches || reduced.matches) return
      rect ??= el.getBoundingClientRect()
      px = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1))
      py = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1))
      if (!raf) raf = requestAnimationFrame(write)
    }
    const leave = () => {px = 0; py = 0; rect = null; if (!raf) raf = requestAnimationFrame(write)}
    const invalidate = () => {rect = null}
    el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave)
    window.addEventListener("resize", invalidate, {passive: true}); window.addEventListener("scroll", invalidate, {passive: true})
    return () => {
      el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave)
      window.removeEventListener("resize", invalidate); window.removeEventListener("scroll", invalidate)
      cancelAnimationFrame(raf)
    }
  }, [])

  React.useEffect(() => {
    if (!open && !menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (menuOpen) {setMenuOpen(false); keyRef.current?.focus()}
      else {setOpen(false); hitRef.current?.focus()}
    }
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuOpen && !menuRef.current?.contains(target) && !keyRef.current?.contains(target)) setMenuOpen(false)
      if (open && !menuOpen && !rootRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("keydown", onKey); document.addEventListener("pointerdown", onDown)
    return () => {document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown)}
  }, [open, menuOpen, setOpen])
  React.useEffect(() => {if (menuOpen) menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus()}, [menuOpen])
  const addFile = () => {
    const file = onAdd?.(files) || {name: "Untitled " + (files.length + 1), meta: "Just now"}
    const next = [...files, file], id = nextId.current++
    ids.current = [...ids.current, id]
    setFiles(next); setDropped(id); setBump(b => b + 1); onFilesChange?.(next)
  }
  const menuItems = [{label: open ? "Close folder" : "Open folder", onSelect: () => setOpen(!open)}, ...menu]
  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])
    const at = items.indexOf(document.activeElement as HTMLElement)
    const go = (index: number) => {event.preventDefault(); items[(index + items.length) % items.length]?.focus()}
    if (event.key === "ArrowDown") go(at + 1)
    else if (event.key === "ArrowUp") go(at - 1)
    else if (event.key === "Home") go(0)
    else if (event.key === "End") go(items.length - 1)
    else if (event.key === "Tab") setMenuOpen(false)
  }
  const start = Math.max(0, files.length - 4), visible = files.slice(start), count = files.length
  const metaLine = meta ?? count + (count === 1 ? " item" : " items")
  return <div ref={rootRef} className={"gf-root" + (className ? " " + className : "")} data-tone={tone} data-open={open || undefined} data-entered={entered || undefined} data-place={labelPlacement} style={{width, height: (H + HEADROOM) * k, ...style}}>
    <div className="gf-stage" style={{transform: `translateY(${HEADROOM * k}px) scale(${k})`}}>
      <div className="gf-tilt">
        <div className="gf-shadow" aria-hidden="true" />
        <div className="gf-back" style={{clipPath: `path('${BACK_PATH}')`}} aria-hidden="true">
          {image ? <img className="gf-art" src={image} alt="" width={W + 24} height={H + 24} loading="lazy" decoding="async" draggable={false} /> : art !== "none" ? <ArtCanvas className="gf-art" art={art} seed={seed} w={W + 24} h={H + 24} density={density} priority={0} /> : null}
          <div className="gf-back-sheen" />
        </div>
        <svg className="gf-rim gf-back-rim" viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><path d={BACK_PATH} /></svg>
        <div key={bump} className={"gf-front" + (bump ? " gf-front--bump" : "")} style={{clipPath: `path('${FRONT_PATH}')`}}>
          <div className="gf-tint" aria-hidden="true" /><div className="gf-spec" aria-hidden="true" />
          <svg className="gf-rim gf-front-rim" viewBox={`0 0 ${W} ${FRONT_H}`} aria-hidden="true"><defs><linearGradient id={"gf-rim-" + uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".35" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity=".12" /></linearGradient></defs><path d={FRONT_PATH} stroke={`url(#gf-rim-${uid})`} /></svg>
          <button ref={hitRef} type="button" className="gf-hit" aria-expanded={open} aria-controls={"gf-files-" + uid} aria-label={`${open ? "Close" : "Open"} ${label} folder`} onClick={() => {setMenuOpen(false); setOpen(!open)}} />
          <div className="gf-label"><span className="gf-title">{label}</span><span className="gf-meta" key={metaLine}>{metaLine}</span></div>
        </div>
        <div id={"gf-files-" + uid} className="gf-files" role="list" aria-label={label + " contents"} inert={!open}>
          {visible.map((file, v) => {
            const id = ids.current[start + v], slot = fanSlot(v, visible.length), jitter = rng(hashString(file.name) + id), picture = !!(file.art || file.image)
            const inner = <>
              {picture ? file.image ? <img className="gf-sheet-art" src={file.image} alt="" width={SHEET_W} height={SHEET_H} loading="lazy" decoding="async" draggable={false} /> : <ArtCanvas className="gf-sheet-art" art={file.art!} seed={hashString(file.name) % 997} w={SHEET_W} h={SHEET_H} density={Math.min(density, 1.25)} priority={1} /> : <span className="gf-lines" aria-hidden="true">{["86%", "92%", "64%", "88%", "42%"].map(width => <i key={width} style={{width}} />)}</span>}
              <span className="gf-sheet-head"><span className="gf-sheet-name">{file.name}</span>{file.meta ? <span className="gf-sheet-meta">{file.meta}</span> : null}</span>
            </>
            const common = {
              className: "gf-sheet" + (picture ? " gf-sheet--art" : "") + (id === dropped ? " gf-sheet--drop" : ""),
              style: {"--gf-slot": slot, "--gf-depth": visible.length - 1 - v, "--gf-jx": ((jitter() - .5) * 10).toFixed(2) + "px", "--gf-jr": ((jitter() - .5) * 3.2).toFixed(2) + "deg", zIndex: v + 1} as React.CSSProperties,
              onAnimationEnd: id === dropped ? () => setDropped(null) : undefined,
            }
            return <div key={id} role="listitem" className="gf-sheet-slot">{file.href ? <a {...common} href={file.href} onClick={() => onFileSelect?.(file, start + v)}>{inner}</a> : <button {...common} type="button" onClick={() => onFileSelect?.(file, start + v)}>{inner}</button>}</div>
          })}
        </div>
        {action !== "none" ? <button ref={keyRef} type="button" className={"gf-key gf-key--" + action} aria-label={action === "add" ? "Add a file to " + label : "More options for " + label} aria-haspopup={action === "more" ? "menu" : undefined} aria-expanded={action === "more" ? menuOpen : undefined} aria-controls={action === "more" ? "gf-menu-" + uid : undefined} onClick={() => action === "add" ? addFile() : setMenuOpen(m => !m)}>{action === "add" ? <Plus key={bump} className="gf-glyph gf-glyph--plus" aria-hidden="true" /> : <Ellipsis className="gf-glyph gf-glyph--more" aria-hidden="true" />}</button> : null}
        {action === "more" ? <div ref={menuRef} id={"gf-menu-" + uid} role="menu" aria-label={label + " options"} className="gf-menu" data-open={menuOpen || undefined} onKeyDown={onMenuKey}>{menuItems.map((item, i) => <button key={item.label + i} type="button" role="menuitem" tabIndex={-1} disabled={!menuOpen} className={"gf-menu-item" + ("danger" in item && item.danger ? " gf-menu-item--danger" : "")} onClick={() => {setMenuOpen(false); keyRef.current?.focus(); item.onSelect?.()}}>{item.label}</button>)}</div> : null}
      </div>
    </div>
  </div>
}
