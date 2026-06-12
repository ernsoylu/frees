import type { ReactNode } from 'react'

/**
 * Component Library (Story 6.1): pre-built vector glyphs for standard
 * engineering objects. Every glyph is drawn in a 100×100 box and scaled by
 * the element's width/height; strokes inherit the element style via props.
 */

export interface LibraryIcon {
  id: string
  label: string
  /** SVG content in 0..100 coordinates. */
  render: (stroke: string, strokeWidth: number, fill: string) => ReactNode
}

const sw = (strokeWidth: number) => Math.max(1, strokeWidth)

export const LIBRARY_ICONS: LibraryIcon[] = [
  {
    id: 'turbine',
    label: 'Turbine',
    render: (stroke, strokeWidth, fill) => (
      <>
        <polygon
          points="20,38 20,62 85,88 85,12"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill={fill}
          strokeLinejoin="round"
        />
        <line x1="0" y1="50" x2="20" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="85" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'pump',
    label: 'Pump',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="35" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <polygon
          points="32,30 32,70 78,50"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill="none"
          strokeLinejoin="round"
        />
        <line x1="0" y1="50" x2="15" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="85" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'compressor',
    label: 'Compressor',
    render: (stroke, strokeWidth, fill) => (
      <>
        <polygon
          points="15,12 15,88 85,62 85,38"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill={fill}
          strokeLinejoin="round"
        />
        <line x1="0" y1="50" x2="15" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="85" y1="50" x2="100" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'valve',
    label: 'Valve',
    render: (stroke, strokeWidth, fill) => (
      <>
        <polygon
          points="10,30 10,70 50,50"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill={fill}
          strokeLinejoin="round"
        />
        <polygon
          points="90,30 90,70 50,50"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill={fill}
          strokeLinejoin="round"
        />
        <line x1="50" y1="50" x2="50" y2="22" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="36" y1="22" x2="64" y2="22" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'heatx',
    label: 'Heat Exchanger',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="38" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <polyline
          points="0,50 24,50 36,30 48,70 60,30 72,70 80,50 100,50"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill="none"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: 'vessel',
    label: 'Vessel',
    render: (stroke, strokeWidth, fill) => (
      <rect
        x="25"
        y="5"
        width="50"
        height="90"
        rx="22"
        stroke={stroke}
        strokeWidth={sw(strokeWidth)}
        fill={fill}
      />
    ),
  },
  {
    id: 'condenser',
    label: 'Condenser / Evaporator',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect
          x="5"
          y="25"
          width="90"
          height="50"
          rx="8"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill={fill}
        />
        <polyline
          points="5,50 20,50 30,35 40,65 50,35 60,65 70,35 80,50 95,50"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill="none"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    id: 'springdamper',
    label: 'Spring-Damper',
    render: (stroke, strokeWidth) => (
      <>
        {/* spring */}
        <polyline
          points="30,0 30,15 18,20 42,28 18,36 42,44 18,52 42,60 30,66 30,80"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill="none"
          strokeLinejoin="round"
        />
        {/* damper */}
        <line x1="70" y1="0" x2="70" y2="28" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <polyline
          points="56,28 84,28"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill="none"
        />
        <polyline
          points="58,52 58,32 82,32 82,52"
          stroke={stroke}
          strokeWidth={sw(strokeWidth)}
          fill="none"
        />
        <line x1="70" y1="46" x2="70" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        {/* common base */}
        <line x1="15" y1="80" x2="85" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="15" y1="92" x2="85" y2="92" stroke={stroke} strokeWidth={sw(strokeWidth)} opacity="0" />
      </>
    ),
  },
]

export function libraryIcon(id: string): LibraryIcon | undefined {
  return LIBRARY_ICONS.find((icon) => icon.id === id)
}
