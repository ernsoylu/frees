import { describe, expect, it } from 'vitest'
import { boxAround, contains, frameBox, visibleBox, zoomAbout } from './viewport'

const screen = (v: { zoom: number; x: number; y: number }, wx: number, wy: number) => ({
  x: wx * v.zoom + v.x,
  y: wy * v.zoom + v.y,
})

describe('schematic viewport', () => {
  it('zooms about the pointer: the drawing point under it stays put', () => {
    const v = { zoom: 0.8, x: 40, y: -25 }
    const at = { x: 300, y: 120 }
    const before = { x: (at.x - v.x) / v.zoom, y: (at.y - v.y) / v.zoom }
    const next = zoomAbout(v, 1.7, at, 0.1, 3)
    expect(next.zoom).toBeCloseTo(1.36)
    expect(screen(next, before.x, before.y).x).toBeCloseTo(at.x)
    expect(screen(next, before.x, before.y).y).toBeCloseTo(at.y)
  })

  it('clamps zoom and still keeps the pointer fixed', () => {
    const v = { zoom: 2, x: 0, y: 0 }
    const next = zoomAbout(v, 10, { x: 100, y: 100 }, 0.25, 3)
    expect(next.zoom).toBe(3)
    expect(screen(next, 50, 50)).toEqual({ x: 100, y: 100 })
  })

  it('frames a box centred, including negative coordinates', () => {
    const box = { minX: -200, minY: -50, w: 400, h: 100 }
    const v = frameBox(box, 800, 600, 3)
    expect(v.zoom).toBe(2)
    expect(screen(v, -200, -50)).toEqual({ x: 0, y: 200 })
    expect(screen(v, 200, 50)).toEqual({ x: 800, y: 400 })
    expect(contains(visibleBox(v, 800, 600), box)).toBe(true)
  })

  it('caps Fit at the maximum zoom', () => {
    expect(frameBox({ minX: 0, minY: 0, w: 10, h: 10 }, 800, 600, 3).zoom).toBe(3)
  })

  it('boxes rectangles with a margin, and nothing as null', () => {
    expect(boxAround([{ x: 0, y: 0, w: 10, h: 5 }, { x: -20, y: 30, w: 4, h: 4 }], 2, 1)).toEqual({
      minX: -22,
      minY: -1,
      w: 34,
      h: 36,
    })
    expect(boxAround([])).toBeNull()
  })
})
