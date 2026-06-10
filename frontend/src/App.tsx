import { useEffect, useState } from 'react'
import { check, CheckResponse, solve, SolveResponse } from './api'

const EXAMPLE = `{ Milestone 1 example }
x + y = 3
y = z - 4
z = x^2 - 3`

function formatValue(value: number): string {
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e7 || abs < 1e-4) return value.toExponential(6)
  return Number(value.toPrecision(8)).toString()
}

export default function App() {
  const [text, setText] = useState(EXAMPLE)
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<SolveResponse | null>(null)
  const [solving, setSolving] = useState(false)
  const [solveCount, setSolveCount] = useState(0)

  const checked = checkResult !== null
  const solvable = checkResult?.solvable === true

  function onTextChange(value: string) {
    setText(value)
    // Like EES, any edit invalidates the previous Check; Solve is gated
    // until the system is re-checked.
    setCheckResult(null)
  }

  async function onCheck() {
    if (checking) return
    setChecking(true)
    try {
      setCheckResult(await check(text))
    } catch (e) {
      setCheckResult({
        solvable: false,
        equations: 0,
        unknowns: 0,
        message: `Could not reach the solver backend: ${String(e)}`,
      })
    } finally {
      setChecking(false)
    }
  }

  async function onSolve() {
    if (solving || !solvable) return
    setSolving(true)
    try {
      const response = await solve(text)
      setResult(response)
    } catch (e) {
      setResult({
        success: false,
        variables: [],
        blocks: [],
        residuals: [],
        stats: null,
        error: `Could not reach the solver backend: ${String(e)}`,
      })
    } finally {
      setSolveCount((n) => n + 1)
      setSolving(false)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        void onSolve()
      }
      if (e.key === 'F4') {
        e.preventDefault()
        void onCheck()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const stats = result?.stats ?? null

  return (
    <div className="app">
      <header>
        <h1>frEES</h1>
        <span className="tagline">free Engineering Equation Solver</span>
      </header>

      <main>
        <section className="window equations-window">
          <h2>Equations Window</h2>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            spellCheck={false}
            placeholder={'Enter equations, e.g.\nx + y = 3\ny = z - 4'}
          />
          <div className="actions">
            <button className="secondary" onClick={onCheck} disabled={checking}>
              {checking ? 'Checking…' : 'Check (F4)'}
            </button>
            <button
              onClick={onSolve}
              disabled={solving || !solvable}
              title={solvable ? 'Solve the system' : 'Run Check first'}
            >
              {solving ? 'Solving…' : 'Solve (F2)'}
            </button>
          </div>
          {checked && (
            <p className={solvable ? 'check-message ok' : 'check-message bad'}>
              {checkResult.message}
            </p>
          )}
          {!checked && (
            <p className="check-message hint">
              Check the equations to enable Solve.
            </p>
          )}
        </section>

        <section className="window solution-window">
          <h2>
            Solution Window
            {solveCount > 0 && <span className="run-badge">run #{solveCount}</span>}
          </h2>

          {result === null && (
            <p className="hint">Check, then Solve. Results appear here.</p>
          )}

          {result && (
            <>
              {stats && (
                <div className="stats">
                  <div className="stat">
                    <span className="stat-value">{stats.equations}</span>
                    <span className="stat-label">equations</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{stats.unknowns}</span>
                    <span className="stat-label">unknowns</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{stats.blocks}</span>
                    <span className="stat-label">blocks</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{stats.elapsedMillis} ms</span>
                    <span className="stat-label">solve time</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatValue(stats.maxResidual)}</span>
                    <span className="stat-label">max residual</span>
                  </div>
                </div>
              )}

              {!result.success && <pre className="error">{result.error}</pre>}

              {result.success && (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>Variable</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.variables.map((v) => (
                        <tr key={v.name}>
                          <td>{v.name}</td>
                          <td className="num">{formatValue(v.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <details>
                    <summary>Calculation order ({result.blocks.length} block{result.blocks.length === 1 ? '' : 's'})</summary>
                    <ol className="blocks">
                      {result.blocks.map((b) => (
                        <li key={b.index}>
                          solves <strong>{b.variables.join(', ')}</strong> from{' '}
                          <code>{b.equations.join(' ; ')}</code>
                        </li>
                      ))}
                    </ol>
                  </details>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
