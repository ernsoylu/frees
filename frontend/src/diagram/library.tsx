import type { ReactNode } from 'react'

/**
 * Component Library (Story 6.1 & Story 10.5): pre-built vector glyphs for standard
 * engineering objects. Every glyph is drawn in a 100×100 box and scaled by
 * the element's width/height; strokes inherit the element style via props.
 */

export interface LibraryIcon {
  id: string
  label: string
  category: 'Thermo-fluid' | 'Mechanical' | 'Sensors & Gauges' | 'Electrical'
  /** SVG content in 0..100 coordinates. */
  render: (stroke: string, strokeWidth: number, fill: string) => ReactNode
}

const sw = (strokeWidth: number) => Math.max(1, strokeWidth)

export const LIBRARY_ICONS: LibraryIcon[] = [
  // ── Thermo-fluid ──────────────────────────────────────────────────────────
  {
    id: 'turbine',
    label: 'Turbine',
    category: 'Thermo-fluid',
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
    category: 'Thermo-fluid',
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
    category: 'Thermo-fluid',
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
    label: 'Throttle/Expansion Valve',
    category: 'Thermo-fluid',
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
    label: 'Shell-and-Tube Exchanger',
    category: 'Thermo-fluid',
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
    label: 'Vessel/Tank',
    category: 'Thermo-fluid',
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
    label: 'Condenser',
    category: 'Thermo-fluid',
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
    id: 'boiler',
    label: 'Boiler',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect x="25" y="15" width="50" height="70" rx="10" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <path d="M35,35 H65 M35,45 H65 M35,55 H65 M35,65 H65" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'evaporator',
    label: 'Evaporator',
    category: 'Thermo-fluid',
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
        <path d="M15,40 Q25,30 35,40 T55,40 T75,40 T95,40" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <path d="M15,60 Q25,50 35,60 T55,60 T75,60 T95,60" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'nozzle',
    label: 'Nozzle',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="15,20 15,80 85,60 85,40" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
    ),
  },
  {
    id: 'diffuser',
    label: 'Diffuser',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="15,40 15,60 85,80 85,20" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
    ),
  },
  {
    id: 'mixing',
    label: 'Mixing Chamber',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="30" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <line x1="10" y1="50" x2="20" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="50" y1="10" x2="50" y2="20" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="80" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'separator',
    label: 'Separator',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect x="30" y="15" width="40" height="70" rx="8" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <line x1="10" y1="50" x2="30" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="50" y1="0" x2="50" y2="15" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="50" y1="85" x2="50" y2="100" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'plate_heatx',
    label: 'Plate Exchanger',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect x="20" y="20" width="60" height="60" rx="4" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <path d="M30,20 L30,80 M40,20 L40,80 M50,20 L50,80 M60,20 L60,80 M70,20 L70,80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'finned_heatx',
    label: 'Finned Heat Exchanger',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth) => (
      <>
        <path d="M20,50 C20,30 40,30 40,50 C40,70 60,70 60,50 C60,30 80,30 80,50" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <path d="M25,20 V80 M35,20 V80 M45,20 V80 M55,20 V80 M65,20 V80 M75,20 V80" stroke={stroke} strokeWidth={sw(strokeWidth)} opacity="0.6" />
      </>
    ),
  },
  {
    id: 'elbow',
    label: 'Pipe Elbow',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth) => (
      <path d="M 10 50 A 40 40 0 0 1 50 90" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth * 3)} strokeLinecap="round" />
    ),
  },
  {
    id: 'tee',
    label: 'Pipe Tee',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth) => (
      <path d="M 10 50 H 90 M 50 50 V 90" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth * 3)} strokeLinecap="round" />
    ),
  },

  // ── Mechanical ─────────────────────────────────────────────────────────────
  {
    id: 'springdamper',
    label: 'Spring-Damper',
    category: 'Mechanical',
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
  {
    id: 'mass',
    label: 'Mass Block',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect x="20" y="25" width="60" height="50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="56" fill={stroke} fontSize="18" textAnchor="middle" fontFamily="monospace" fontWeight="bold">m</text>
      </>
    ),
  },
  {
    id: 'pulley',
    label: 'Pulley',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="30" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <circle cx="50" cy="50" r="6" stroke={stroke} strokeWidth={sw(strokeWidth)} fill="none" />
        <line x1="20" y1="20" x2="20" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="80" y1="50" x2="80" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'gear',
    label: 'Gear',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="28" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <circle cx="50" cy="50" r="8" stroke={stroke} strokeWidth={sw(strokeWidth)} fill="none" />
        <path d="M50,14 V22 M50,78 V86 M14,50 H22 M78,50 H86 M24,24 L30,30 M70,70 L76,76 M24,76 L30,70 M70,24 L76,30" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'piston',
    label: 'Piston Cylinder',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <path d="M20,25 H70 V75 H20" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <rect x="45" y="28" width="10" height="44" fill={stroke} />
        <line x1="50" y1="50" x2="95" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
      </>
    ),
  },
  {
    id: 'ground',
    label: 'Pin/Ground',
    category: 'Mechanical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="10" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
        <path d="M15,50 L5,65 M30,50 L20,65 M45,50 L35,65 M60,50 L50,65 M75,50 L65,65 M90,50 L80,65" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },

  // ── Sensors & Gauges ───────────────────────────────────────────────────────
  {
    id: 'temp_sensor',
    label: 'Temperature Sensor',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="57" fill={stroke} fontSize="20" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">T</text>
        <line x1="25" y1="50" x2="10" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'press_sensor',
    label: 'Pressure Sensor',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="57" fill={stroke} fontSize="20" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">P</text>
        <line x1="25" y1="50" x2="10" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'flow_meter',
    label: 'Flow Meter',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="57" fill={stroke} fontSize="20" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">F</text>
        <line x1="25" y1="50" x2="10" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },

  // ── Electrical ─────────────────────────────────────────────────────────────
  {
    id: 'resistor',
    label: 'Resistor',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <path d="M 10 50 H 25 L 30 35 L 40 65 L 50 35 L 60 65 L 70 35 L 75 50 H 90" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
    ),
  },
  {
    id: 'capacitor',
    label: 'Capacitor',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="10" y1="50" x2="42" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="42" y1="25" x2="42" y2="75" stroke={stroke} strokeWidth={sw(strokeWidth * 2)} />
        <line x1="58" y1="25" x2="58" y2="75" stroke={stroke} strokeWidth={sw(strokeWidth * 2)} />
        <line x1="58" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'inductor',
    label: 'Inductor',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <path d="M10,50 H22 C22,35 34,35 34,50 C34,35 46,35 46,50 C46,35 58,35 58,50 C58,35 70,35 70,50 C70,35 82,35 82,50 H90" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
    ),
  },
  {
    id: 'source',
    label: 'Voltage Source',
    category: 'Electrical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="30" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="35" y="56" fill={stroke} fontSize="20" textAnchor="middle" fontWeight="bold">+</text>
        <text x="65" y="54" fill={stroke} fontSize="20" textAnchor="middle" fontWeight="bold">-</text>
        <line x1="10" y1="50" x2="20" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="80" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'elec_ground',
    label: 'Electrical Ground',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="50" y1="20" x2="50" y2="60" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="30" y1="60" x2="70" y2="60" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
        <line x1="40" y1="70" x2="60" y2="70" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
        <line x1="46" y1="80" x2="54" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
      </>
    ),
  },
]

export function libraryIcon(id: string): LibraryIcon | undefined {
  return LIBRARY_ICONS.find((icon) => icon.id === id)
}
