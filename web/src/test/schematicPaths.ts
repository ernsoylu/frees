import type { SchematicNode } from '../schematic/layout'

/**
 * Ids of the boxes a routed path enters, ignoring the two port stubs (first and
 * last segment), which start on a block's face by design.
 */
export function boxesEntered(path: string, boxes: readonly SchematicNode[]): string[] {
  const tokens = path.trim().split(/\s+/)
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i]
    const last = pts[pts.length - 1]
    if (cmd === 'M' || cmd === 'L') {
      pts.push({ x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) })
      i += 3
    } else if (cmd === 'H') {
      pts.push({ x: Number(tokens[i + 1]), y: last.y })
      i += 2
    } else {
      pts.push({ x: last.x, y: Number(tokens[i + 1]) })
      i += 2
    }
  }
  const hit = new Set<string>()
  for (let i = 2; i < pts.length - 1; i++) {
    const [u, v] = [pts[i - 1], pts[i]]
    for (const n of boxes) {
      if (Math.max(u.x, v.x) > n.x && Math.min(u.x, v.x) < n.x + n.w && Math.max(u.y, v.y) > n.y && Math.min(u.y, v.y) < n.y + n.h) {
        hit.add(n.id)
      }
    }
  }
  return [...hit]
}
