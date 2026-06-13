/**
 * A tiny, safe arithmetic evaluator for Diagram attribute bindings (Story 6.3).
 *
 * Formulas reference solved variables by name and drive SVG attributes in Run
 * mode — e.g. binding a piston's `y` to `stroke * sin(theta)`. Variable names
 * are case-insensitive (frees convention). Supported syntax:
 *
 *   numbers (1, 2.5, 1e3) · identifiers · + - * / ^ · unary +/- ·
 *   parentheses · function calls · the constant `pi`
 *
 * Functions: sin cos tan asin acos atan sqrt abs exp ln log10 min max pow mod.
 */

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  sin: (a) => Math.sin(a[0]),
  cos: (a) => Math.cos(a[0]),
  tan: (a) => Math.tan(a[0]),
  asin: (a) => Math.asin(a[0]),
  acos: (a) => Math.acos(a[0]),
  atan: (a) => Math.atan(a[0]),
  sqrt: (a) => Math.sqrt(a[0]),
  abs: (a) => Math.abs(a[0]),
  exp: (a) => Math.exp(a[0]),
  ln: (a) => Math.log(a[0]),
  log10: (a) => Math.log10(a[0]),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  pow: (a) => Math.pow(a[0], a[1]),
  mod: (a) => a[0] % a[1],
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'comma' }

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++
    } else if (c >= '0' && c <= '9') {
      let j = i + 1
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      if (j < src.length && (src[j] === 'e' || src[j] === 'E')) {
        j++
        if (j < src.length && (src[j] === '+' || src[j] === '-')) j++
        while (j < src.length && /[0-9]/.test(src[j])) j++
      }
      tokens.push({ t: 'num', v: Number(src.slice(i, j)) })
      i = j
    } else if (/[a-zA-Z_]/.test(c)) {
      let j = i + 1
      while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++
      tokens.push({ t: 'id', v: src.slice(i, j) })
      i = j
    } else if ('+-*/^'.includes(c)) {
      tokens.push({ t: 'op', v: c })
      i++
    } else if (c === '(') {
      tokens.push({ t: 'lp' })
      i++
    } else if (c === ')') {
      tokens.push({ t: 'rp' })
      i++
    } else if (c === ',') {
      tokens.push({ t: 'comma' })
      i++
    } else {
      throw new Error(`Unexpected character '${c}'`)
    }
  }
  return tokens
}

class Parser {
  private pos = 0
  constructor(
    private readonly tokens: Token[],
    private readonly vars: Map<string, number>,
  ) {}

  parse(): number {
    const value = this.expr()
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing input')
    }
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private expr(): number {
    let value = this.term()
    let tok = this.peek()
    while (tok && tok.t === 'op' && (tok.v === '+' || tok.v === '-')) {
      this.pos++
      const rhs = this.term()
      value = tok.v === '+' ? value + rhs : value - rhs
      tok = this.peek()
    }
    return value
  }

  private term(): number {
    let value = this.factor()
    let tok = this.peek()
    while (tok && tok.t === 'op' && (tok.v === '*' || tok.v === '/')) {
      this.pos++
      const rhs = this.factor()
      value = tok.v === '*' ? value * rhs : value / rhs
      tok = this.peek()
    }
    return value
  }

  private factor(): number {
    const base = this.unary()
    const tok = this.peek()
    if (tok && tok.t === 'op' && tok.v === '^') {
      this.pos++
      return Math.pow(base, this.factor()) // right-associative
    }
    return base
  }

  private unary(): number {
    const tok = this.peek()
    if (tok && tok.t === 'op' && (tok.v === '+' || tok.v === '-')) {
      this.pos++
      const v = this.unary()
      return tok.v === '-' ? -v : v
    }
    return this.primary()
  }

  private primary(): number {
    const tok = this.peek()
    if (!tok) throw new Error('Unexpected end of formula')
    if (tok.t === 'num') {
      this.pos++
      return tok.v
    }
    if (tok.t === 'lp') {
      this.pos++
      const v = this.expr()
      this.expect('rp')
      return v
    }
    if (tok.t === 'id') {
      this.pos++
      const next = this.peek()
      if (next && next.t === 'lp') {
        const fn = FUNCTIONS[tok.v.toLowerCase()]
        if (!fn) throw new Error(`Unknown function '${tok.v}'`)
        this.pos++
        const args = this.argList()
        this.expect('rp')
        return fn(args)
      }
      const name = tok.v.toLowerCase()
      if (name === 'pi') return Math.PI
      const value = this.vars.get(name)
      if (value === undefined || !Number.isFinite(value)) {
        throw new Error(`Variable '${tok.v}' has no value`)
      }
      return value
    }
    throw new Error('Unexpected token')
  }

  private argList(): number[] {
    const args: number[] = []
    if (this.peek()?.t === 'rp') return args
    args.push(this.expr())
    while (this.peek()?.t === 'comma') {
      this.pos++
      args.push(this.expr())
    }
    return args
  }

  private expect(type: Token['t']) {
    const tok = this.peek()
    if (!tok || tok.t !== type) throw new Error(`Expected ${type}`)
    this.pos++
  }
}

/** Evaluates a formula, returning null if it is invalid or references an unsolved variable. */
export function evalFormula(
  formula: string | undefined,
  values: Map<string, number>,
): number | null {
  if (!formula || formula.trim() === '') return null
  try {
    const result = new Parser(tokenize(formula), values).parse()
    return Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

/** Lowercased variable names referenced by a formula (excludes functions and `pi`). */
export function formulaVars(formula: string | undefined): string[] {
  if (!formula) return []
  let tokens: Token[]
  try {
    tokens = tokenize(formula)
  } catch {
    return []
  }
  const out = new Set<string>()
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.t !== 'id') continue
    const name = tok.v.toLowerCase()
    if (name === 'pi') continue
    if (tokens[i + 1]?.t === 'lp') continue // function name
    out.add(name)
  }
  return [...out]
}
