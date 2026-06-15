import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { Extension, StateEffect, StateField } from '@codemirror/state'
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language'
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { FUNCTION_CATEGORIES } from './functionCatalog'

// Imperative handle the parent uses to drive the editor (insert at caret, jump
// to a line) without reaching into the DOM, mirroring the old textareaRef ops.
export interface EquationEditorHandle {
  insertSnippet: (snippet: string) => void
  goToLine: (line: number) => void
  focus: () => void
}

// frees keywords (block/control-flow) highlighted distinctly from functions.
const KEYWORDS = new Set([
  'FOR', 'TO', 'STEP', 'WHILE', 'DO', 'REPEAT', 'UNTIL', 'IF', 'THEN', 'ELSE',
  'END', 'FUNCTION', 'PROCEDURE', 'MODULE', 'CALL', 'PARAMETRIC', 'TABLE',
  'PLOT', 'DUPLICATE', 'AND', 'OR', 'NOT',
])

// Built-in function names pulled from the Functions-menu catalog: the leading
// identifier of each snippet, minus the block scaffolds (which start with a
// keyword). Used for syntax highlighting and autocomplete.
const FUNCTION_NAMES = Array.from(
  new Set(
    FUNCTION_CATEGORIES.flatMap((c) => c.items)
      .map((it) => /^([A-Za-z_][A-Za-z0-9_]*\$?)/.exec(it.snippet)?.[1] ?? '')
      .filter((name) => name && !KEYWORDS.has(name.toUpperCase())),
  ),
)
const FUNCTION_SET = new Set(FUNCTION_NAMES.map((n) => n.toLowerCase()))

interface StreamState {
  inComment: boolean
}

// A small line-oriented tokenizer for the frees language: {comments}, string
// literals, numbers, keywords, and known built-in functions. Unknown
// identifiers (user variables) are left unstyled.
const freesLanguage = StreamLanguage.define<StreamState>({
  startState: () => ({ inComment: false }),
  token(stream, state) {
    if (state.inComment) {
      while (!stream.eol()) {
        if (stream.next() === '}') {
          state.inComment = false
          break
        }
      }
      return 'comment'
    }
    if (stream.eatSpace()) return null
    if (stream.eol()) return null

    const ch = stream.peek() ?? ''
    if (ch === '{') {
      stream.next()
      while (!stream.eol()) {
        if (stream.next() === '}') return 'comment'
      }
      state.inComment = true
      return 'comment'
    }
    if (ch === '"' || ch === "'") {
      stream.next()
      while (!stream.eol()) {
        if (stream.next() === ch) break
      }
      return 'string'
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(stream.string.charAt(stream.pos + 1)))) {
      if (!stream.match(/^\d*\.?\d+([eE][+-]?\d+)?[ij]?/)) stream.next()
      return 'number'
    }
    if (/[A-Za-z_]/.test(ch)) {
      stream.match(/^[A-Za-z_][A-Za-z0-9_]*\$?/)
      const word = stream.current()
      if (KEYWORDS.has(word.toUpperCase())) return 'keyword'
      if (FUNCTION_SET.has(word.toLowerCase())) return 'function'
      return null
    }
    if (/[+\-*/^=<>:|,]/.test(ch)) {
      stream.next()
      return 'operator'
    }
    stream.next()
    return null
  },
  tokenTable: {
    comment: tags.comment,
    string: tags.string,
    number: tags.number,
    keyword: tags.keyword,
    function: tags.function(tags.variableName),
    operator: tags.operator,
  },
})

const freesHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#7d8590', fontStyle: 'italic' },
  { tag: tags.string, color: '#38d9a9' },
  { tag: tags.number, color: '#ffa94d' },
  { tag: tags.keyword, color: '#da77f2', fontWeight: 'bold' },
  { tag: tags.function(tags.variableName), color: '#74c0fc' },
  { tag: tags.operator, color: '#ced4da' },
])

// Dark theme tuned to the surrounding Mantine dark palette so the editor blends
// with the rest of the workspace (matches the old textarea colours).
const freesTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--mantine-color-dark-7)',
      color: 'var(--mantine-color-dark-0)',
      fontSize: 'var(--mantine-font-size-sm)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--mantine-font-family-monospace)',
      caretColor: 'var(--mantine-color-dark-0)',
    },
    '.cm-scroller': {
      fontFamily: 'var(--mantine-font-family-monospace)',
      lineHeight: '1.6',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--mantine-color-dark-8)',
      color: 'var(--mantine-color-dark-3)',
      border: 'none',
      borderRight: '1px solid var(--mantine-color-dark-5)',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--mantine-color-dark-7)' },
    '.cm-errorLine': {
      backgroundColor: 'rgba(250, 82, 82, 0.13)',
      boxShadow: 'inset 2px 0 0 var(--mantine-color-red-6)',
    },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
)

// State-managed decoration that paints the line a syntax error points at. The
// parent pushes the line number via the setErrorLine effect.
const setErrorLine = StateEffect.define<number | null>()
const errorLineDecoration = Decoration.line({ class: 'cm-errorLine' })

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(setErrorLine)) {
        const line = effect.value
        if (line == null || line < 1 || line > tr.state.doc.lines) {
          value = Decoration.none
        } else {
          const target = tr.state.doc.line(line)
          value = Decoration.set([errorLineDecoration.range(target.from)])
        }
      }
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

function makeCompletionSource(
  namesRef: React.MutableRefObject<{ functions: string[]; variables: string[] }>,
) {
  return (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_]*$/)
    if (!word || (word.from === word.to && !context.explicit)) return null
    const { functions, variables } = namesRef.current
    const options = [
      ...functions.map((name) => ({ label: name, type: 'function', apply: `${name}(` })),
      ...variables.map((name) => ({ label: name, type: 'variable' })),
    ]
    return { from: word.from, options }
  }
}

interface Props {
  value: string
  onChange: (value: string) => void
  variables: string[]
  errorLine: number | null
  placeholder?: string
}

function EquationEditorInner(
  { value, onChange, variables, errorLine, placeholder }: Readonly<Props>,
  ref: React.Ref<EquationEditorHandle>,
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Read by the (stable) completion source so suggestions always reflect the
  // latest variable list without reconfiguring the editor.
  const namesRef = useRef({ functions: FUNCTION_NAMES, variables })
  namesRef.current.variables = variables

  const extensions = useMemo<Extension[]>(
    () => [
      freesLanguage,
      freesLanguage.data.of({ autocomplete: makeCompletionSource(namesRef) }),
      syntaxHighlighting(freesHighlight),
      freesTheme,
      errorLineField,
    ],
    [],
  )

  // Push the error-line decoration whenever the prop changes (and once on mount,
  // after onCreateEditor has captured the view).
  useEffect(() => {
    const view = viewRef.current
    if (view) view.dispatch({ effects: setErrorLine.of(errorLine) })
  }, [errorLine])

  useImperativeHandle(
    ref,
    () => ({
      insertSnippet(snippet: string) {
        const view = viewRef.current
        if (!view) return
        const caretMark = snippet.indexOf('$0')
        const clean = snippet.replace('$0', '')
        const { from, to } = view.state.selection.main
        const caret = from + (caretMark >= 0 ? caretMark : clean.length)
        view.dispatch({
          changes: { from, to, insert: clean },
          selection: { anchor: caret },
        })
        view.focus()
      },
      goToLine(line: number) {
        const view = viewRef.current
        if (!view) return
        const n = Math.min(Math.max(line, 1), view.state.doc.lines)
        const target = view.state.doc.line(n)
        view.dispatch({
          selection: { anchor: target.from, head: target.to },
          scrollIntoView: true,
        })
        view.focus()
      },
      focus() {
        viewRef.current?.focus()
      },
    }),
    [],
  )

  return (
    <CodeMirror
      ref={cmRef}
      value={value}
      onChange={onChange}
      extensions={extensions}
      placeholder={placeholder}
      theme="none"
      height="100%"
      style={{ flex: 1, minHeight: 260, overflow: 'hidden' }}
      basicSetup={{ foldGutter: false, highlightActiveLine: true, bracketMatching: true }}
      onCreateEditor={(view) => {
        viewRef.current = view
        view.dispatch({ effects: setErrorLine.of(errorLine) })
      }}
    />
  )
}

const EquationEditor = forwardRef(EquationEditorInner)
export default EquationEditor
