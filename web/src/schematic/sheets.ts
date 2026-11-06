import type { ConnectionDto } from '../api'
import { endpointBlock, junctionIdOf } from './layout'

/**
 * VIEW-10 / WIRE-11: further sheets of the same model. The main sheet shows
 * every component except those moved off it; another sheet shows the blocks
 * placed on it. A component placed on two sheets is one component drawn
 * twice. A net with endpoints off the sheet ends in off-page connectors,
 * keyed by the net, never by their label.
 */
export interface Sheet {
  /** `s1`, `s2`, …; `main` is the implicit first sheet. */
  id: string
  name: string
  /** Block ids placed on this sheet. */
  members: string[]
  positions: Record<string, { x: number; y: number }>
}

export const MAIN = 'main'

export interface SheetState {
  sheets: Sheet[]
  /** Blocks removed from the main sheet; each is on at least one other sheet. */
  offMain: string[]
  /** WIRE-11: a connector name per net (`netKeyOf`), display only. */
  netNames: Record<string, string>
}

/** The identity of a net: its junction id, whatever the net's size. */
export const netKeyOf = (endpoints: readonly string[]) => junctionIdOf(endpoints)

const onOtherSheet = (s: SheetState, id: string) => s.sheets.some((sh) => sh.members.includes(id))

/** Whether block `id` is drawn on `sheet`. A block off the main sheet but on no other returns to it. */
export function isOnSheet(s: SheetState, sheet: string, id: string): boolean {
  if (sheet === MAIN) return !s.offMain.includes(id) || !onOtherSheet(s, id)
  return s.sheets.find((sh) => sh.id === sheet)?.members.includes(id) ?? false
}

/** The sheets block `id` is drawn on, main first. */
export function occurrencesOf(s: SheetState, id: string): string[] {
  return [MAIN, ...s.sheets.map((sh) => sh.id)].filter((sheet) => isOnSheet(s, sheet, id))
}

export function sheetName(s: SheetState, sheet: string): string {
  return sheet === MAIN ? 'Main' : (s.sheets.find((sh) => sh.id === sheet)?.name ?? sheet)
}

export function addSheet<S extends SheetState>(s: S, name: string): { state: S; id: string } {
  let n = s.sheets.length + 1
  while (s.sheets.some((sh) => sh.id === `s${n}`)) n++
  const id = `s${n}`
  return { id, state: { ...s, sheets: [...s.sheets, { id, name: name.trim() || `Sheet ${n + 1}`, members: [], positions: {} }] } }
}

export function renameSheet<S extends SheetState>(s: S, sheet: string, name: string): S {
  return { ...s, sheets: s.sheets.map((sh) => (sh.id === sheet && name.trim() ? { ...sh, name: name.trim() } : sh)) }
}

/** Deleting a sheet deletes its occurrences; a block drawn nowhere else returns to the main sheet. */
export function deleteSheet<S extends SheetState>(s: S, sheet: string): S {
  const sheets = s.sheets.filter((sh) => sh.id !== sheet)
  return { ...s, sheets, offMain: s.offMain.filter((id) => sheets.some((sh) => sh.members.includes(id))) }
}

/** Draw `ids` on `sheet` too (each stays one component). */
export function placeOnSheet<S extends SheetState>(s: S, sheet: string, ids: readonly string[]): S {
  if (sheet === MAIN) return { ...s, offMain: s.offMain.filter((id) => !ids.includes(id)) }
  return {
    ...s,
    sheets: s.sheets.map((sh) => (sh.id === sheet ? { ...sh, members: [...sh.members, ...ids.filter((id) => !sh.members.includes(id))] } : sh)),
  }
}

/**
 * Remove the occurrences of `ids` from `sheet`. The model is untouched, and a
 * block's last occurrence is never removed: `kept` lists those, for which the
 * only removal left is Delete component.
 */
export function removeFromSheet<S extends SheetState>(s: S, sheet: string, ids: readonly string[]): { state: S; kept: string[] } {
  const kept = ids.filter((id) => occurrencesOf(s, id).length <= 1 && isOnSheet(s, sheet, id))
  const gone = ids.filter((id) => !kept.includes(id))
  if (sheet === MAIN) return { kept, state: { ...s, offMain: [...s.offMain, ...gone.filter((id) => !s.offMain.includes(id))] } }
  return {
    kept,
    state: {
      ...s,
      sheets: s.sheets.map((sh) => {
        if (sh.id !== sheet) return sh
        const positions = Object.fromEntries(Object.entries(sh.positions).filter(([id]) => !gone.includes(id)))
        return { ...sh, members: sh.members.filter((id) => !gone.includes(id)), positions }
      }),
    },
  }
}

/** Move `ids` from one sheet to another: placed there, then removed here. */
export function moveToSheet<S extends SheetState>(s: S, from: string, to: string, ids: readonly string[]): S {
  return removeFromSheet(placeOnSheet(s, to, ids), from, ids).state
}

type Positions = Record<string, { x: number; y: number }>

/** Where blocks sit on `sheet`: the presentation's own positions for the main sheet. */
export function positionsOn(p: SheetState & { positions: Positions }, sheet: string): Positions {
  return sheet === MAIN ? p.positions : (p.sheets.find((sh) => sh.id === sheet)?.positions ?? {})
}

/** `p` with the positions on `sheet` replaced. */
export function withPositions<S extends SheetState & { positions: Positions }>(p: S, sheet: string, positions: Positions): S {
  if (sheet === MAIN) return { ...p, positions }
  return { ...p, sheets: p.sheets.map((sh) => (sh.id === sheet ? { ...sh, positions } : sh)) }
}

/** Drop `ids` from every sheet, as when their components are deleted from the model. */
export function forgetBlocks<S extends SheetState>(p: S, ids: ReadonlySet<string>): S {
  const keep = (id: string) => !ids.has(id)
  return {
    ...p,
    offMain: p.offMain.filter(keep),
    sheets: p.sheets.map((sh) => ({ ...sh, members: sh.members.filter(keep), positions: Object.fromEntries(Object.entries(sh.positions).filter(([id]) => keep(id))) })),
  }
}

/** The block an off-page connector is drawn as: a port-less boundary node, one per net per sheet. */
export const offPageId = (net: string) => `$off$${net.slice(net.indexOf('$node$') + 6)}`
export const isOffPage = (id: string) => id.startsWith('$off$')

/** One off-page connector: where net `net` leaves the sheet, drawn as block `id`. */
export interface OffPage {
  id: string
  net: string
  endpoint: string
  /** Sheets holding the net's other endpoints, main first. */
  partners: string[]
  /** A block on the first partner sheet that the net reaches: where the connector leads. */
  target: string
}

/**
 * The connections drawn on a sheet. A net wholly on the sheet is kept; one
 * wholly off it is dropped; one partly on it keeps its endpoints here and gets
 * one off-page connector, joined to them as one more endpoint, naming the
 * sheets that hold the rest. Membership is by block: `sub1.r1.b` is on the sheet when `sub1.r1`
 * or an enclosing subsystem `sub1` is.
 */
export function sheetNets(s: SheetState, sheet: string, connections: readonly ConnectionDto[]): { connections: ConnectionDto[]; offPage: OffPage[] } {
  // The block or enclosing subsystem of `endpoint` drawn on `where`, if any.
  const drawnOn = (where: string, endpoint: string) => {
    const path = endpointBlock(endpoint).toLowerCase().split('.')
    return path.map((_, k) => path.slice(0, k + 1).join('.')).find((id) => isOnSheet(s, where, id))
  }
  const on = (endpoint: string) => drawnOn(sheet, endpoint) !== undefined
  const kept: ConnectionDto[] = []
  const offPage: OffPage[] = []
  for (const c of connections) {
    const here = c.endpoints.filter(on)
    if (here.length === 0) continue
    if (here.length === c.endpoints.length) {
      kept.push(c)
      continue
    }
    const away = c.endpoints.filter((e) => !on(e))
    const sheets = [MAIN, ...s.sheets.map((sh) => sh.id)].filter((other) => other !== sheet)
    const partners = sheets.filter((other) => away.some((e) => drawnOn(other, e) !== undefined))
    const target = away.map((e) => drawnOn(partners[0], e)).find((id) => id !== undefined) ?? ''
    const net = netKeyOf(c.endpoints)
    // The connector joins the net here like one more endpoint, so the layout
    // places it and the router draws its wire as any other.
    kept.push({ ...c, endpoints: [...here, offPageId(net)] })
    offPage.push({ id: offPageId(net), net, endpoint: here[0], partners, target })
  }
  return { connections: kept, offPage }
}

/** WIRE-11: a connector's label — the name given to its net, else the net's first endpoint. */
export function connectorLabel(s: SheetState, net: string): string {
  return s.netNames[net] ?? net.slice(net.indexOf('$node$') + 6)
}

export const EMPTY_SHEETS: SheetState = { sheets: [], offMain: [], netNames: {} }

const MAX_SHEETS = 50
const ref = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200 && /^\$?[A-Za-z_][\w$]*(\.[A-Za-z_][\w$]*)*$/.test(v)
const coord = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100_000
const record = (v: unknown): Record<string, unknown> | null => (v != null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

/** Validate the sheet slice of a v5 presentation; anything malformed is dropped and counted. */
export function sanitizeSheets(raw: Record<string, unknown>): { state: SheetState; repaired: number } {
  let repaired = 0
  const sheets: Sheet[] = []
  for (const v of Array.isArray(raw.sheets) ? raw.sheets : []) {
    const sh = record(v)
    if (!sh || typeof sh.id !== 'string' || !/^s\d{1,4}$/.test(sh.id) || typeof sh.name !== 'string' || !sh.name.trim() || sh.name.length > 60
      || !Array.isArray(sh.members) || sheets.length >= MAX_SHEETS || sheets.some((x) => x.id === sh.id)) {
      repaired++
      continue
    }
    const members = [...new Set(sh.members.filter(ref))]
    repaired += sh.members.length - members.length
    const positions: Sheet['positions'] = {}
    for (const [k, p] of Object.entries(record(sh.positions) ?? {})) {
      const { x, y } = record(p) ?? {}
      if ((members.includes(k) || (k.startsWith('$off$') && ref(k))) && coord(x) && coord(y)) positions[k] = { x, y }
      else repaired++
    }
    sheets.push({ id: sh.id, name: sh.name, members, positions })
  }
  const off = Array.isArray(raw.offMain) ? raw.offMain : []
  const offMain = [...new Set(off.filter(ref))].filter((id) => sheets.some((sh) => sh.members.includes(id)))
  repaired += off.length - offMain.length
  const netNames: Record<string, string> = {}
  for (const [k, name] of Object.entries(record(raw.netNames) ?? {})) {
    if (k.length <= 200 && k.includes('$node$') && typeof name === 'string' && name.trim() && name.length <= 60) netNames[k] = name
    else repaired++
  }
  return { state: { sheets, offMain, netNames }, repaired }
}
