import { useMemo } from 'react'
import katex from 'katex'
// Colocated with the only component that renders KaTeX markup, so the
// stylesheet travels with the lazy chunk that needs it instead of anchoring
// the katex JS chunk to the entry (see main.tsx).
import 'katex/dist/katex.min.css'

interface Props {
  math: string
  block?: boolean
}

// Rendered during render, not in an effect, so a server render (the static
// book) carries the same markup as the app.
export default function Latex({ math, block = false }: Readonly<Props>) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        // Emit MathML alongside the visual HTML so screen readers can read the
        // equation (KaTeX marks the HTML aria-hidden and exposes the MathML).
        output: 'htmlAndMathml',
      })
    } catch (err) {
      // KaTeX can still throw on malformed input despite throwOnError:
      // false; degrade to plain text so the equation stays visible.
      console.error('KaTeX rendering failed, showing plain text:', err)
      return undefined
    }
  }, [math, block])

  // Inline math sits inside paragraphs, where only phrasing content (a span) is valid.
  const props = html === undefined ? { children: math } : { dangerouslySetInnerHTML: { __html: html } }
  return block ? <div {...props} /> : <span style={{ display: 'inline-block' }} {...props} />
}
