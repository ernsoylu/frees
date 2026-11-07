// @vitest-environment node
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './examples'
import { directionOf, LESSONS } from './lessons'
import { pinnableParameters, sliderOverrideEquation } from './sliders'
import { initSync, solve } from './wasm/pkg/frees.js'

initSync({ module: readFileSync(new URL('./wasm/pkg/frees_bg.wasm', import.meta.url)) })

const valueOf = (text: string, overrides: string[], name: string) => {
  const r = JSON.parse(solve(text, JSON.stringify({ overrides }))) as { success: boolean; variables: { name: string; value: number }[] }
  expect(r.success).toBe(true)
  return r.variables.find((v) => v.name.toLowerCase() === name.toLowerCase())!.value
}

describe('lesson manifests (I2)', () => {
  it.each(LESSONS.map((l) => [l.example, l] as const))('%s sits beside a graded example whose own literals it approves', (_, lesson) => {
    const example = EXAMPLES.find((e) => e.id === lesson.example)
    expect(example, 'the gallery example exists').toBeDefined()
    expect(example!.text).toMatch(/\{\s*CHECK\s/)
    const pinnable = pinnableParameters(example!.text)
    for (const s of lesson.sliders) {
      expect(pinnable.has(s.name.toLowerCase()) || pinnable.has(s.name), `${s.name} is a literal the model assigns`).toBe(true)
      expect(s.min < s.value && s.value < s.max).toBe(true)
    }
    const changed = lesson.sliders.find((s) => s.name === lesson.change.variable)!
    expect(changed, 'the change moves an approved slider').toBeDefined()
    expect(lesson.change.to).toBeGreaterThanOrEqual(changed.min)
    expect(lesson.change.to).toBeLessThanOrEqual(changed.max)
    if (lesson.pair) expect(LESSONS.find((l) => l.example === lesson.pair)?.pair).toBe(lesson.example)
    expect(lesson.sources.length).toBeGreaterThan(0)
    expect(lesson.domain).not.toBe('')
    expect(lesson.concepts.length).toBeGreaterThan(0)
  })

  it.each(LESSONS.map((l) => [l.example, l] as const))('%s: the change shows the promised direction and reset reproduces the baseline', (_, lesson) => {
    const text = EXAMPLES.find((e) => e.id === lesson.example)!.text
    const baseline = lesson.sliders.map(sliderOverrideEquation)
    const changed = lesson.sliders.map((s) => sliderOverrideEquation(s.name === lesson.change.variable ? { ...s, value: lesson.change.to } : s))
    const v0 = valueOf(text, baseline, lesson.observe.variable)
    const v1 = valueOf(text, changed, lesson.observe.variable)
    expect(directionOf(v0, v1)).toBe(lesson.observe.expect)
    expect(valueOf(text, baseline, lesson.observe.variable)).toBe(v0)
    // The plain document is the baseline: the sliders start where the model does.
    expect(valueOf(text, [], lesson.observe.variable)).toBe(v0)
  })

  it('reads round-off as no change', () => {
    expect(directionOf(1, 1 + 1e-12)).toBe('stays the same')
    expect(directionOf(1, 1.001)).toBe('rises')
    expect(directionOf(-2, -3)).toBe('falls')
  })
})
