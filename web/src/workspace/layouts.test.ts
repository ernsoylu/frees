// Phase Q: the named-layout store survives corrupt storage and keeps desktop and compact apart.
import { describe, expect, it } from 'vitest'
import { EMPTY_LAYOUTS, deleteLayout, layoutForm, parseLayouts, renameLayout, saveLayout } from './layouts'

const dock = { grid: {}, panels: {} }

describe('named layouts', () => {
  it('reads corrupt, foreign or newer storage as empty', () => {
    for (const raw of [null, '', '{', '[]', '"x"', '{"version":2,"desktop":[{"name":"a","dock":{}}]}']) expect(parseLayouts(raw)).toEqual(EMPTY_LAYOUTS)
  })

  it('drops a malformed entry and keeps the rest', () => {
    const raw = JSON.stringify({ version: 1, desktop: [{ name: 'Good', dock, density: 'compact', ribbonTab: 'view' }, { name: '', dock }, { name: 'No dock' }, null, { name: 'good', dock }, { name: 'Odd', dock, density: 'huge', ribbonTab: 3 }], compact: 'nope' })
    expect(parseLayouts(raw)).toEqual({ version: 1, desktop: [{ name: 'Good', dock, density: 'compact', ribbonTab: 'view' }, { name: 'Odd', dock, density: undefined, ribbonTab: undefined }], compact: [] })
  })

  it('saves by name, replacing one of the same name, apart per form', () => {
    let s = saveLayout(EMPTY_LAYOUTS, 'desktop', { name: ' Review ', dock })
    s = saveLayout(s, 'compact', { name: 'Review', dock: { compact: true } })
    s = saveLayout(s, 'desktop', { name: 'review', dock: { second: true } })
    expect(s.desktop).toEqual([{ name: 'review', dock: { second: true } }])
    expect(s.compact).toEqual([{ name: 'Review', dock: { compact: true } }])
    expect(JSON.stringify(parseLayouts(JSON.stringify(s)))).toBe(JSON.stringify(s))
  })

  it('renames unless the name is empty or taken, and deletes', () => {
    let s = saveLayout(saveLayout(EMPTY_LAYOUTS, 'desktop', { name: 'A', dock }), 'desktop', { name: 'B', dock })
    expect(renameLayout(s, 'desktop', 'A', ' b ')).toBeNull()
    expect(renameLayout(s, 'desktop', 'A', '  ')).toBeNull()
    s = renameLayout(s, 'desktop', 'A', 'a2')!
    expect(s.desktop.map((l) => l.name)).toEqual(['a2', 'B'])
    expect(deleteLayout(s, 'desktop', 'b').desktop.map((l) => l.name)).toEqual(['a2'])
  })

  it('calls a narrow screen compact', () => {
    expect(layoutForm(1440)).toBe('desktop')
    expect(layoutForm(1023)).toBe('compact')
  })
})
