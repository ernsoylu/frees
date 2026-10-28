/** Pan and zoom of the schematic: drawing point W lands on screen at W·zoom + (x, y). */
export interface View {
  zoom: number
  x: number
  y: number
}

/** A drawing-space rectangle. */
export interface Box {
  minX: number
  minY: number
  w: number
  h: number
}

/** Zoom by `factor`, clamped to [min, max], keeping screen point `at` over the same drawing point. */
export function zoomAbout(v: View, factor: number, at: { x: number; y: number }, min: number, max: number): View {
  const zoom = Math.min(max, Math.max(min, v.zoom * factor))
  const k = zoom / v.zoom
  return { zoom, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k }
}

/** The view showing `box` whole and centred in a w × h viewport, never zoomed past `max`. */
export function frameBox(box: Box, w: number, h: number, max: number): View {
  const zoom = Math.min(w / box.w, h / box.h, max)
  return {
    zoom,
    x: (w - box.w * zoom) / 2 - box.minX * zoom,
    y: (h - box.h * zoom) / 2 - box.minY * zoom,
  }
}

/** The drawing-space rectangle a w × h viewport shows. */
export function visibleBox(v: View, w: number, h: number): Box {
  return { minX: -v.x / v.zoom, minY: -v.y / v.zoom, w: w / v.zoom, h: h / v.zoom }
}

/** The smallest box holding every rectangle, each grown by mx / my; null when there are none. */
export function boxAround(
  rects: Iterable<{ x: number; y: number; w: number; h: number }>,
  mx = 0,
  my = 0,
): Box | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x - mx)
    minY = Math.min(minY, r.y - my)
    maxX = Math.max(maxX, r.x + r.w + mx)
    maxY = Math.max(maxY, r.y + r.h + my)
  }
  return minX === Infinity ? null : { minX, minY, w: maxX - minX, h: maxY - minY }
}

/** Whether `inner` lies wholly inside `outer`, to within half a drawing unit. */
export function contains(outer: Box, inner: Box): boolean {
  return (
    inner.minX >= outer.minX - 0.5 &&
    inner.minY >= outer.minY - 0.5 &&
    inner.minX + inner.w <= outer.minX + outer.w + 0.5 &&
    inner.minY + inner.h <= outer.minY + outer.h + 0.5
  )
}
