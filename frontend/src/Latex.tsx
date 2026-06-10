import { useEffect, useRef } from 'react'
import katex from 'katex'

interface Props {
  math: string
  block?: boolean
}

export default function Latex({ math, block = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
        })
      } catch (err) {
        containerRef.current.textContent = math
      }
    }
  }, [math, block])

  return <div ref={containerRef} style={{ display: block ? 'block' : 'inline-block' }} />
}
