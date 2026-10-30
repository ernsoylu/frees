import { beforeAll, describe, expect, it } from 'vitest'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { resolve } from 'node:path'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { fileURLToPath } from 'node:url'
import { initSync, solve } from '../wasm/pkg/frees.js'
import { blockDependencies, lineOfEquation } from './dependencies'

beforeAll(() => {
  initSync({ module: readFileSync(resolve(fileURLToPath(import.meta.url), '../../wasm/pkg/frees_bg.wasm')) })
})

const TEXT = `x = 2
y = x^2 + 1 // comment
z + w = y
z - w = 1
q = sin(z)*X
`

describe('blockDependencies (SYNC-10)', () => {
  it('links each block to the earlier blocks whose variables its equations name, from the real solve', () => {
    const { blocks } = JSON.parse(solve(TEXT, '{}'))
    expect(blocks.map((b: { variables: string[] }) => b.variables)).toEqual([['x'], ['y'], ['w', 'z'], ['q']])
    expect(blockDependencies(blocks)).toEqual([
      { from: 0, to: 1, via: ['x'] },
      { from: 1, to: 2, via: ['y'] },
      { from: 0, to: 3, via: ['x'] },
      { from: 2, to: 3, via: ['z'] },
    ])
    expect(lineOfEquation(TEXT, 'y = x^2 + 1')).toBe(2)
    expect(lineOfEquation(TEXT, 'z - w = 1')).toBe(4)
    expect(lineOfEquation(TEXT, 'nowhere = 1')).toBeNull()
  })
})
