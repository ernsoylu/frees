/**
 * A tiny, safe arithmetic evaluator for Diagram attribute bindings (Story 6.3).
 *
 * Formulas reference solved variables by name and drive SVG attributes in Run
 * mode — e.g. binding a piston's `y` to `stroke * sin(theta)`. Variable names
 * are case-insensitive (frees convention). Supported syntax:
 *
 *   numbers (1, 2.5, 1e3) · identifiers · + - * / ^ · unary +/- ·
 *   parentheses · function calls · built-in constants (pi#, g#, ...)
 *
 * Functions: sin cos tan asin acos atan sqrt abs exp ln log10 min max pow mod.
 */

/**
 * Built-in constants (EES convention: a trailing '#' marks a constant, e.g.
 * pi#, g#). Values mirror the backend ConstantsRegistry; diagram formulas work
 * on already-solved SI values, so only the numeric magnitude is needed here.
 */
const CONSTANTS: Record<string, number> = {
  'pi#': Math.PI,
  'e#': Math.E,
  'r#': 8.314462618,
  'g#': 9.80665,
  'na#': 6.02214076e23,
  'k#': 1.380649e-23,
  'h#': 6.62607015e-34,
  'c#': 299792458.0,
  'sigma#': 5.670374419e-8,
  'gc#': 6.6743e-11,
  'qe#': 1.602176634e-19,
}

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

function isSpace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

/** Scans a numeric literal (with optional exponent) starting at {@code i}; pushes
 *  the token and returns the index past it. */
function scanNumber(src: string, i: number, tokens: Token[]): number {
  let j = i + 1
  while (j < src.length && /[0-9.]/.test(src[j])) j++
  if (j < src.length && (src[j] === 'e' || src[j] === 'E')) {
    j++
    if (j < src.length && (src[j] === '+' || src[j] === '-')) j++
    while (j < src.length && /\d/.test(src[j])) j++
  }
  tokens.push({ t: 'num', v: Number(src.slice(i, j)) })
  return j
}

/** Scans an identifier (with optional trailing '#' for a built-in constant). */
function scanIdentifier(src: string, i: number, tokens: Token[]): number {
  let j = i + 1
  while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++
  if (j < src.length && src[j] === '#') j++
  tokens.push({ t: 'id', v: src.slice(i, j) })
  return j
}

/** Scans a relational/equality operator (<, >, =, ! optionally followed by '='). */
function scanRelational(src: string, i: number, tokens: Token[]): number {
  let v = src[i]
  let next = i + 1
  if (src[i + 1] === '=') {
    v += '='
    next++
  }
  tokens.push({ t: 'op', v })
  return next
}

/** Scans arithmetic/logical operators, parentheses and commas; throws on any
 *  unexpected character. */
function scanPunctuation(src: string, i: number, tokens: Token[]): number {
  const c = src[i]
  if ('+-*/^'.includes(c)) {
    tokens.push({ t: 'op', v: c })
    return i + 1
  }
  if (c === '&' && src[i + 1] === '&') {
    tokens.push({ t: 'op', v: '&&' })
    return i + 2
  }
  if (c === '|' && src[i + 1] === '|') {
    tokens.push({ t: 'op', v: '||' })
    return i + 2
  }
  if (c === '(') {
    tokens.push({ t: 'lp' })
    return i + 1
  }
  if (c === ')') {
    tokens.push({ t: 'rp' })
    return i + 1
  }
  if (c === ',') {
    tokens.push({ t: 'comma' })
    return i + 1
  }
  throw new Error(`Unexpected character '${c}'`)
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (isSpace(c)) {
      i++
    } else if (c >= '0' && c <= '9') {
      i = scanNumber(src, i, tokens)
    } else if (/[a-zA-Z_]/.test(c)) {
      i = scanIdentifier(src, i, tokens)
    } else if (c === '<' || c === '>' || c === '=' || c === '!') {
      i = scanRelational(src, i, tokens)
    } else {
      i = scanPunctuation(src, i, tokens)
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
    const value = this.logicalOr()
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing input')
    }
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private logicalOr(): number {
    let value = this.logicalAnd()
    let tok = this.peek()
    while (tok && tok.t === 'op' && tok.v === '||') {
      this.pos++
      const rhs = this.logicalAnd()
      value = (value !== 0 || rhs !== 0) ? 1 : 0
      tok = this.peek()
    }
    return value
  }

  private logicalAnd(): number {
    let value = this.equality()
    let tok = this.peek()
    while (tok && tok.t === 'op' && tok.v === '&&') {
      this.pos++
      const rhs = this.equality()
      value = (value !== 0 && rhs !== 0) ? 1 : 0
      tok = this.peek()
    }
    return value
  }

  private equality(): number {
    let value = this.relational()
    let tok = this.peek()
    while (tok && tok.t === 'op' && (tok.v === '==' || tok.v === '!=')) {
      this.pos++
      const rhs = this.relational()
      if (tok.v === '==') {
        value = Math.abs(value - rhs) < 1e-9 ? 1 : 0
      } else {
        value = Math.abs(value - rhs) >= 1e-9 ? 1 : 0
      }
      tok = this.peek()
    }
    return value
  }

  private relational(): number {
    let value = this.expr()
    let tok = this.peek()
    while (tok && tok.t === 'op' && (tok.v === '<' || tok.v === '>' || tok.v === '<=' || tok.v === '>=')) {
      this.pos++
      const rhs = this.expr()
      if (tok.v === '<') value = value < rhs ? 1 : 0
      else if (tok.v === '>') value = value > rhs ? 1 : 0
      else if (tok.v === '<=') value = value <= rhs ? 1 : 0
      else if (tok.v === '>=') value = value >= rhs ? 1 : 0
      tok = this.peek()
    }
    return value
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
    if (tok && tok.t === 'op' && (tok.v === '+' || tok.v === '-' || tok.v === '!')) {
      this.pos++
      const v = this.unary()
      if (tok.v === '-') return -v
      if (tok.v === '!') return v === 0 ? 1 : 0
      return v
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
      return this.primaryIdentifier(tok)
    }
    throw new Error('Unexpected token')
  }

  /** Resolves an identifier primary: a function call f(...), a built-in constant,
   *  or a bound variable value. */
  private primaryIdentifier(tok: { t: 'id'; v: string }): number {
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
    if (name in CONSTANTS) return CONSTANTS[name]
    const value = this.vars.get(name)
    if (value === undefined || !Number.isFinite(value)) {
      throw new Error(`Variable '${tok.v}' has no value`)
    }
    return value
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

/** Lowercased variable names referenced by a formula (excludes functions and constants). */
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
    if (name in CONSTANTS) continue
    if (tokens[i + 1]?.t === 'lp') continue // function name
    out.add(name)
  }
  return [...out]
}
