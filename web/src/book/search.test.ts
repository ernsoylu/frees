// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { matchEntries } from './search.js'

const entries = [
  { title: 'RC charging', path: 'gallery/a.html', kind: 'lesson', blurb: 'τ = RC', keywords: '', text: '', concepts: ['time constant'], domains: ['Electrical'], prerequisites: ['Ohm’s law'] },
  { title: 'A cooling thermal mass', path: 'gallery/b.html', kind: 'lesson', blurb: '', keywords: '', text: 'exponential', concepts: ['time constant'], domains: ['Thermal'], prerequisites: [] },
  { title: 'Solver options', path: 'guide/c.html', kind: 'guide', blurb: 'time step control', keywords: 'ode', text: 'charging is not here' },
]

describe('Book search (I5)', () => {
  it('starts from the lessons, in manifest order so pairs sit together', () => {
    expect(matchEntries(entries, '', {}).map((e) => e.title)).toEqual(['RC charging', 'A cooling thermal mass'])
  })

  it('needs every term, ranks title hits first, and searches guides too', () => {
    expect(matchEntries(entries, 'charging', {}).map((e) => e.title)).toEqual(['RC charging', 'Solver options'])
    expect(matchEntries(entries, 'time step', {}).map((e) => e.title)).toEqual(['Solver options'])
  })

  it('narrows to lessons carrying every chosen concept, domain and prerequisite', () => {
    expect(matchEntries(entries, '', { concepts: 'time constant' })).toHaveLength(2)
    expect(matchEntries(entries, '', { concepts: 'time constant', domains: 'Thermal' }).map((e) => e.title)).toEqual(['A cooling thermal mass'])
    expect(matchEntries(entries, 'charging', { prerequisites: 'Ohm’s law' }).map((e) => e.title)).toEqual(['RC charging'])
  })
})
