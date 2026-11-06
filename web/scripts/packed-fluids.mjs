// Phase E: the browser module links four fluids and installs the others on
// first use from the files `frees-fluid-pack` writes to src/wasm/fluids.
// Node hosts (the doc checks, the Book, tests) serve every fluid, so they
// install all of them right after initialising the module.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/wasm/fluids')

export function installPackedFluids(engine) {
  let files
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith('.rpf')).sort()
  } catch {
    throw new Error(`${DIR} is missing: run \`cargo run -p frees-fluid-pack -- web/src/wasm/fluids\` from the repository root`)
  }
  for (const file of files) {
    const result = JSON.parse(engine.install_property_table(readFileSync(join(DIR, file))))
    if (result.error) throw new Error(`${file}: ${result.error}`)
  }
}
