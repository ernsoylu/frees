// Story 10.11: Record the running diagram animation to a video file.
//
// Captures the live run-mode canvas (exactly what the operator sees, including
// tweened playback, the time clock, and path-following motion) by rasterizing
// each frame of the on-screen SVG onto a canvas and recording that canvas's
// stream with the browser-native MediaRecorder. Output is WebM (VP9/VP8); MP4
// is used when the browser advertises support.

import type { DiagramExportTheme } from './exportDiagram'

const THEME_BG: Record<DiagramExportTheme, string> = {
  light: '#ffffff',
  dark: '#141517',
}

function pickMime(): { mime: string; ext: string } {
  const candidates: { mime: string; ext: string }[] = [
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
    { mime: 'video/mp4', ext: 'mp4' },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
      return c
    }
  }
  return { mime: '', ext: 'webm' }
}

/** Serialize the live SVG to a standalone frame at its on-screen pixel size. */
function serializeFrame(svgEl: SVGSVGElement, theme: DiagramExportTheme): {
  markup: string
  width: number
  height: number
} {
  const rect = svgEl.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('x', '0')
  bg.setAttribute('y', '0')
  bg.setAttribute('width', String(width))
  bg.setAttribute('height', String(height))
  bg.setAttribute('fill', THEME_BG[theme])
  clone.insertBefore(bg, clone.firstChild)

  const markup = new XMLSerializer().serializeToString(clone)
  return { markup, width, height }
}

function loadImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to rasterize a frame for recording.'))
    }
    img.src = url
  })
}

/**
 * Records the live diagram animation. Call start() (the caller should kick off
 * playback first), then stop() to finalize and download. MediaRecorder is not
 * available in every environment, so isSupported() gates the UI.
 */
export class DiagramRecorder {
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private running = false
  private ext = 'webm'
  private mime = ''

  static isSupported(): boolean {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function'
    )
  }

  start(svgEl: SVGSVGElement, theme: DiagramExportTheme, fps = 30) {
    const rect = svgEl.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(rect.width))
    canvas.height = Math.max(1, Math.round(rect.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available for recording.')

    const { mime, ext } = pickMime()
    this.mime = mime
    this.ext = ext
    const stream = canvas.captureStream(fps)
    this.recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    this.chunks = []
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
    this.running = true

    // Continuously rasterize the live SVG onto the recording canvas. The next
    // frame is only scheduled once the current one has drawn, so slow
    // rasterization throttles naturally instead of piling up.
    const drawLoop = async () => {
      if (!this.running) return
      try {
        const { markup } = serializeFrame(svgEl, theme)
        const img = await loadImage(markup)
        if (!this.running) return
        ctx.fillStyle = THEME_BG[theme]
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      } catch {
        // Skip an unrenderable frame rather than aborting the whole recording.
      }
      if (this.running) requestAnimationFrame(() => void drawLoop())
    }
    void drawLoop()
  }

  isRecording(): boolean {
    return this.running
  }

  /** Stop recording and trigger a download of the captured clip. */
  stop(name: string): Promise<void> {
    return new Promise((resolve) => {
      this.running = false
      const rec = this.recorder
      if (!rec) {
        resolve()
        return
      }
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mime || 'video/webm' })
        const base = name.trim().replace(/[^\w.-]+/g, '_') || 'diagram'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${base}.${this.ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        this.recorder = null
        this.chunks = []
        resolve()
      }
      rec.stop()
    })
  }
}
