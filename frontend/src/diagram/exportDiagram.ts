// Story 10.10: Diagram export.
//
// Serializes the live diagram canvas into a clean, standalone SVG (independent
// of the editor's pan/zoom, grid, and selection chrome) and exports it as SVG
// or PNG client-side, or as PDF/EPS by reusing the backend Apache FOP pipeline
// (`/api/export`) that already serves the Plot Window.

import { exportVector } from '../api'

export type DiagramExportFormat = 'svg' | 'png' | 'pdf' | 'eps'
export type DiagramExportTheme = 'light' | 'dark'

export interface DiagramExportOptions {
  scale: number
  theme: DiagramExportTheme
  padding?: number
}

const THEME_BG: Record<DiagramExportTheme, string> = {
  light: '#ffffff',
  dark: '#141517',
}

interface BuiltSvg {
  markup: string
  width: number
  height: number
}

/**
 * Build a standalone SVG string from the diagram canvas. Only the marked
 * `[data-export-content]` group is captured, which excludes the grid, smart
 * guides, and selection handles. The content is re-framed to a tight bounding
 * box with padding and a theme background.
 */
export function buildExportSvg(
  svgEl: SVGSVGElement,
  opts: DiagramExportOptions,
): BuiltSvg {
  const content = svgEl.querySelector<SVGGraphicsElement>('[data-export-content]')
  if (!content) {
    throw new Error('Diagram canvas is not ready to export.')
  }
  const bbox = content.getBBox()
  if (bbox.width === 0 || bbox.height === 0) {
    throw new Error('This diagram is empty — add elements before exporting.')
  }

  const pad = opts.padding ?? 24
  const w = bbox.width + pad * 2
  const h = bbox.height + pad * 2

  const ns = 'http://www.w3.org/2000/svg'
  const out = document.createElementNS(ns, 'svg')
  out.setAttribute('xmlns', ns)
  out.setAttribute('width', String(w * opts.scale))
  out.setAttribute('height', String(h * opts.scale))
  out.setAttribute('viewBox', `0 0 ${w} ${h}`)

  const bg = document.createElementNS(ns, 'rect')
  bg.setAttribute('x', '0')
  bg.setAttribute('y', '0')
  bg.setAttribute('width', String(w))
  bg.setAttribute('height', String(h))
  bg.setAttribute('fill', THEME_BG[opts.theme])
  out.appendChild(bg)

  // Clone the content group and re-frame it so the bounding box starts at the
  // padding offset, dropping the live pan/zoom transform entirely.
  const group = content.cloneNode(true) as SVGGraphicsElement
  group.setAttribute('transform', `translate(${pad - bbox.x} ${pad - bbox.y})`)
  out.appendChild(group)

  const markup = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(out)
  return { markup, width: Math.round(w * opts.scale), height: Math.round(h * opts.scale) }
}

/** Download arbitrary text as a file (used for diagram JSON export/backup). */
export function downloadTextFile(text: string, filename: string, mime = 'application/json') {
  triggerDownload(new Blob([text], { type: `${mime};charset=utf-8` }), filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Rasterize an SVG string to a PNG blob via an offscreen canvas. */
function svgToPng(markup: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas not available for PNG export.'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to rasterize diagram to PNG.'))
      }, 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load diagram SVG for rasterization.'))
    }
    img.src = url
  })
}

/**
 * Export the diagram in the given format. SVG and PNG are produced entirely on
 * the client; PDF and EPS are transcoded by the backend FOP pipeline.
 */
export async function exportDiagram(
  svgEl: SVGSVGElement,
  format: DiagramExportFormat,
  name: string,
  opts: DiagramExportOptions,
): Promise<void> {
  const { markup, width, height } = buildExportSvg(svgEl, opts)
  const base = name.trim().replace(/[^\w.-]+/g, '_') || 'diagram'

  switch (format) {
    case 'svg':
      triggerDownload(
        new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }),
        `${base}.svg`,
      )
      return
    case 'png': {
      const png = await svgToPng(markup, width, height)
      triggerDownload(png, `${base}.png`)
      return
    }
    case 'pdf':
    case 'eps': {
      const blob = await exportVector(markup, format)
      triggerDownload(blob, `${base}.${format}`)
      return
    }
  }
}
