import { expect, it } from 'vitest'
import type { ConnectionDto } from '../api'
import {
  addSheet, deleteSheet, EMPTY_SHEETS, isOnSheet, MAIN, moveToSheet, netKeyOf, occurrencesOf,
  placeOnSheet, removeFromSheet, sanitizeSheets, sheetNets,
} from './sheets'

const net = (...endpoints: string[]): ConnectionDto => ({ domain: 'fluid', endpoints })

it('keeps one identity for a block drawn on two sheets', () => {
  const { state, id } = addSheet(EMPTY_SHEETS, 'Coolant')
  const both = placeOnSheet(state, id, ['pump'])
  expect(occurrencesOf(both, 'pump')).toEqual([MAIN, id])
  // Removing the main occurrence leaves the component on its other sheet.
  const moved = removeFromSheet(both, MAIN, ['pump'])
  expect(moved.kept).toEqual([])
  expect(occurrencesOf(moved.state, 'pump')).toEqual([id])
  // Its last occurrence is never removed: that is Delete component's job.
  const last = removeFromSheet(moved.state, id, ['pump'])
  expect(last.kept).toEqual(['pump'])
  expect(occurrencesOf(last.state, 'pump')).toEqual([id])
})

it('returns blocks to the main sheet when their only other sheet is deleted', () => {
  const { state, id } = addSheet(EMPTY_SHEETS, 'Loop')
  const moved = moveToSheet(state, MAIN, id, ['a', 'b'])
  expect(isOnSheet(moved, MAIN, 'a')).toBe(false)
  const gone = deleteSheet(moved, id)
  expect(isOnSheet(gone, MAIN, 'a')).toBe(true)
  expect(gone.offMain).toEqual([])
})

it('ends a net that leaves the sheet in an off-page connector keyed by the net', () => {
  const { state, id } = addSheet(EMPTY_SHEETS, 'Loop')
  const s = moveToSheet(state, MAIN, id, ['hx'])
  const nets = [net('pump.out', 'hx.in'), net('hx.out', 'tank.in', 'valve.in'), net('tank.out', 'pump.in')]
  const main = sheetNets(s, MAIN, nets)
  expect(main.connections.map((c) => c.endpoints)).toEqual([
    ['pump.out', '$off$hx.in'],
    ['tank.in', 'valve.in', '$off$hx.out'],
    ['tank.out', 'pump.in'],
  ])
  expect(main.offPage).toEqual([
    { id: '$off$hx.in', net: netKeyOf(['pump.out', 'hx.in']), endpoint: 'pump.out', partners: [id], target: 'hx' },
    { id: '$off$hx.out', net: netKeyOf(['hx.out', 'tank.in', 'valve.in']), endpoint: 'tank.in', partners: [id], target: 'hx' },
  ])
  const loop = sheetNets(s, id, nets)
  expect(loop.connections.map((c) => c.endpoints)).toEqual([['hx.in', '$off$hx.in'], ['hx.out', '$off$hx.out']])
  // Partners share the net key: the connectors on both sheets name the same net.
  expect(loop.offPage.map((o) => o.net)).toEqual(main.offPage.map((o) => o.net))
  expect(loop.offPage.map((o) => [o.partners, o.target])).toEqual([[[MAIN], 'pump'], [[MAIN], 'tank']])
})

it('counts a subsystem member on the sheet its subsystem is on', () => {
  const s = moveToSheet(addSheet(EMPTY_SHEETS, 'Sub').state, MAIN, 's1', ['sub1'])
  const { connections, offPage } = sheetNets(s, 's1', [net('sub1.r1.b', 'sub1.r2.a'), net('sub1.r2.b', 'src.p')])
  expect(connections).toHaveLength(2)
  expect(offPage[0].endpoint).toBe('sub1.r2.b')
})

it('drops malformed sheet entries and counts them', () => {
  const { state, repaired } = sanitizeSheets({
    sheets: [
      { id: 's1', name: 'Loop', members: ['pump', 'bad id!'], positions: { pump: { x: 1, y: 2 }, ghost: { x: 0, y: 0 } } },
      { id: 's1', name: 'Duplicate', members: [] },
      { id: 'x', name: 'Bad id', members: [] },
    ],
    offMain: ['pump', 'nowhere'],
    netNames: { '$node$pump.out': 'Supply', bogus: 'x' },
  })
  expect(state.sheets).toEqual([{ id: 's1', name: 'Loop', members: ['pump'], positions: { pump: { x: 1, y: 2 } } }])
  expect(state.offMain).toEqual(['pump'])
  expect(state.netNames).toEqual({ '$node$pump.out': 'Supply' })
  expect(repaired).toBe(6)
})
