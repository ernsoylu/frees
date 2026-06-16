// Token-aware formula text input with variable/function autocomplete.
//
// Diagram binding/conditional/widget formulas are expressions (e.g.
// "30*sin(theta)"), so we can't replace the whole field like a normal
// Autocomplete. Instead we look at the identifier token under the caret and
// suggest matching solved-variable names (and common math functions),
// completing just that token on selection.

import { useRef, useState, type ReactNode } from 'react'
import { Combobox, TextInput, useCombobox } from '@mantine/core'

const MATH_FUNCS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sqrt', 'exp', 'ln',
  'log', 'log10', 'abs', 'min', 'max', 'floor', 'ceil', 'round', 'mod',
  'sinh', 'cosh', 'tanh', 'sign', 'pi', 'e',
]

interface Props {
  value: string
  onChange: (value: string) => void
  varNames: string[]
  label?: ReactNode
  description?: ReactNode
  placeholder?: string
  size?: string
}

interface Suggestion {
  name: string
  isFunc: boolean
}

export function FormulaInput({
  value,
  onChange,
  varNames,
  label,
  description,
  placeholder,
  size = 'xs',
}: Readonly<Props>) {
  const combobox = useCombobox()
  const inputRef = useRef<HTMLInputElement>(null)
  const [caret, setCaret] = useState(0)

  // The identifier being typed immediately before the caret, if any.
  const token = (() => {
    const m = value.slice(0, caret).match(/[A-Za-z_][A-Za-z0-9_$]*$/)
    return m ? { text: m[0], start: caret - m[0].length } : null
  })()

  const suggestions: Suggestion[] = (() => {
    if (!token) return []
    const q = token.text.toLowerCase()
    const seen = new Set<string>()
    const out: Suggestion[] = []
    const funcSet = new Set(MATH_FUNCS)
    for (const n of [...varNames, ...MATH_FUNCS]) {
      const low = n.toLowerCase()
      if (low === q || seen.has(low) || !low.startsWith(q)) continue
      seen.add(low)
      out.push({ name: n, isFunc: funcSet.has(n) })
      if (out.length >= 8) break
    }
    return out
  })()

  const syncCaret = () => {
    const el = inputRef.current
    if (el) setCaret(el.selectionStart ?? el.value.length)
  }

  const complete = (s: Suggestion) => {
    if (!token) return
    const insert = s.isFunc ? `${s.name}(` : s.name
    const next = value.slice(0, token.start) + insert + value.slice(caret)
    const nextCaret = token.start + insert.length
    onChange(next)
    combobox.closeDropdown()
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        el.selectionStart = el.selectionEnd = nextCaret
        setCaret(nextCaret)
      }
    })
  }

  return (
    <Combobox
      store={combobox}
      withinPortal
      onOptionSubmit={(val) => {
        const s = suggestions.find((x) => x.name === val)
        if (s) complete(s)
      }}
    >
      <Combobox.Target>
        <TextInput
          ref={inputRef}
          label={label}
          description={description}
          placeholder={placeholder}
          size={size}
          value={value}
          styles={{ input: { fontFamily: 'monospace' } }}
          onChange={(e) => {
            onChange(e.currentTarget.value)
            setCaret(e.currentTarget.selectionStart ?? e.currentTarget.value.length)
            combobox.openDropdown()
          }}
          onClick={syncCaret}
          onKeyUp={syncCaret}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => combobox.closeDropdown()}
          onKeyDown={(e) => {
            if (suggestions.length === 0) return
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              combobox.selectNextOption()
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              combobox.selectPreviousOption()
            } else if (e.key === 'Enter') {
              const picked = combobox.selectActiveOption()
              if (picked) e.preventDefault()
            } else if (e.key === 'Escape') {
              combobox.closeDropdown()
            }
          }}
        />
      </Combobox.Target>
      <Combobox.Dropdown hidden={suggestions.length === 0}>
        <Combobox.Options>
          {suggestions.map((s) => (
            <Combobox.Option value={s.name} key={s.name}>
              {s.name}
              {s.isFunc ? '( )' : ''}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
