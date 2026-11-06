// Phase E: the browser module links four fluids; the rest and the mixture
// tables are packed by `frees-fluid-pack` into ./fluids/ and installed on
// first use (engine.worker.ts). This checks the built module and the packed
// files together: what is linked, that nothing else is, and that every
// packed fluid and named blend answers once installed.
import { beforeAll, expect, it } from 'vitest'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { readFileSync } from 'node:fs'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { resolve } from 'node:path'
// @ts-expect-error Node built-in module not declared in Vite client tsconfig
import { fileURLToPath } from 'node:url'
import {
  fluid_available,
  fluids_used,
  initSync,
  install_property_table,
  mixture_tables_available,
  solve,
} from './pkg/frees.js'

interface Manifest {
  keys: Record<string, string>
  fluids: Record<string, { file: string; needs: string[] }>
  mixtures: string
  blends: Record<string, string[]>
}
const here = resolve(fileURLToPath(import.meta.url), '..')
const read = (file: string) => readFileSync(resolve(here, 'fluids', file))
const manifest = JSON.parse(String(read('manifest.json'))) as Manifest

beforeAll(() => {
  initSync({ module: readFileSync(resolve(here, 'pkg/frees_bg.wasm')) })
})

const value = (text: string, name: string) => {
  const r = JSON.parse(solve(text, '{}')) as { variables?: { name: string; value: number }[]; message?: string }
  return r.variables?.find((v) => v.name === name)?.value ?? r.message ?? JSON.stringify(r)
}
const rel = (got: unknown, want: number) => (typeof got === 'number' ? Math.abs(got / want - 1) : Infinity)
const install = (file: string) => JSON.parse(install_property_table(new Uint8Array(read(file)))) as { fluids?: string[]; error?: string }

it('links four fluids and nothing else; an unlinked fluid fails until it is installed', () => {
  for (const name of ['Water', 'R134a', 'R1234yf', 'Air']) expect(fluid_available(name)).toBe(true)
  expect(Object.keys(manifest.fluids)).toHaveLength(24)
  for (const name of Object.keys(manifest.fluids)) expect(fluid_available(name), name).toBe(false)
  expect(mixture_tables_available()).toBe(false)

  const o2 = 'rho = Density(Oxygen, T=300 [K], P=101325 [Pa])'
  expect(JSON.parse(fluids_used(o2))).toEqual(['Oxygen'])
  expect(String(value(o2, 'rho'))).toMatch(/Unknown fluid 'Oxygen'/)
  expect(install(manifest.fluids.Oxygen.file)).toEqual({ fluids: ['Oxygen'] })
  expect(fluid_available('Oxygen')).toBe(true)
  // The native CLI, which links Oxygen, answers 1.3006898082601743.
  expect(rel(value(o2, 'rho'), 1.3006898082601743)).toBeLessThan(1e-12)
  // A second install of the same fluid is a no-op.
  expect(install(manifest.fluids.Oxygen.file)).toEqual({ fluids: ['Oxygen'] })
  expect(install('manifest.json').error).toBeTruthy()
})

it('serves every packed fluid and every named blend once installed', () => {
  for (const { file } of Object.values(manifest.fluids)) expect(install(file).error).toBeUndefined()
  expect(install(manifest.mixtures)).toEqual({ fluids: [] })
  expect(mixture_tables_available()).toBe(true)
  for (const name of Object.keys(manifest.fluids)) expect(fluid_available(name), name).toBe(true)

  // Each document spelling resolves through the alias table to installed data.
  for (const fluid of ['CarbonDioxide', 'Propane', 'IsoButane', 'R1234ze', 'R410A', 'R32', 'Hydrogen']) {
    const h = value(`h = Enthalpy(${fluid}, T=300 [K], P=101325 [Pa])`, 'h')
    expect(Number.isFinite(h), `${fluid}: ${h}`).toBe(true)
  }
  // The blends need the tables and their components (R32, R125, R1234ze(E),
  // R227EA, CO2). Native CLI values, which link them all:
  expect(rel(value('h = Enthalpy(R454B, T=273.15 [K], x=0)', 'h'), 206526.1244312285)).toBeLessThan(1e-12)
  expect(rel(value('p = Pressure(R515B, T=273.15 [K], x=0)', 'p'), 216365.887751593)).toBeLessThan(1e-12)
  for (const blend of ['R448A', 'R449A', 'R452A', 'R452B', 'R454A', 'R454C', 'R455A', 'R513A']) {
    const p = value(`p = Pressure(${blend}, T=273.15 [K], x=0)`, 'p')
    expect(Number.isFinite(p) && (p as number) > 1e5, `${blend}: ${p}`).toBe(true)
  }
})
