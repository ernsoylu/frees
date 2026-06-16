import type { ReactNode } from 'react'

/**
 * Component Library (Story 6.1 & Story 10.5): pre-built vector glyphs for standard
 * engineering objects. Every glyph is drawn in a 100×100 box and scaled by
 * the element's width/height; strokes inherit the element style via props.
 */

export interface LibraryIcon {
  id: string
  label: string
  category: 'Basic Shapes' | 'Thermo-fluid' | 'Mechanical' | 'Sensors & Gauges' | 'Electrical'
  /** SVG content in 0..100 coordinates. */
  render: (stroke: string, strokeWidth: number, fill: string) => ReactNode
}

const sw = (strokeWidth: number) => Math.max(1, strokeWidth)

export const LIBRARY_ICONS: LibraryIcon[] = [
  // ── Basic Shapes (Visio-style stencil) ─────────────────────────────────────
  {
    id: 'triangle',
    label: 'Triangle',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="50,8 92,92 8,92" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'right_triangle',
    label: 'Right Triangle',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="10,10 10,90 90,90" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'diamond',
    label: 'Diamond',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="50,6 94,50 50,94 6,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'pentagon',
    label: 'Pentagon',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="50,4 93.8,35.8 77,87.2 23,87.2 6.2,35.8" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="25,8 75,8 96,50 75,92 25,92 4,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'octagon',
    label: 'Octagon',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'trapezoid',
    label: 'Trapezoid',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="22,24 78,24 96,82 4,82" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'parallelogram',
    label: 'Parallelogram',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="26,24 96,24 74,82 4,82" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'star5',
    label: '5-Point Star',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="50,4 60.6,35.4 93.8,35.8 60.6,55.6 77,87.2 50,68 23,87.2 32.9,55.6 6.2,35.8 39.4,35.4" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'star6',
    label: '6-Point Star',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <polygon points="50,4 61.5,30.1 89.8,27 73,50 89.8,73 61.5,69.9 50,96 38.5,69.9 10.2,73 27,50 10.2,27 38.5,30.1" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'cross',
    label: 'Cross / Plus',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M38,8 H62 V38 H92 V62 H62 V92 H38 V62 H8 V38 H38 Z" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'block_arrow',
    label: 'Block Arrow',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M8,38 H58 V20 L92,50 L58,80 V62 H8 Z" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'chevron',
    label: 'Chevron',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M8,22 L48,22 L82,50 L48,78 L8,78 L42,50 Z" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'callout',
    label: 'Callout / Speech',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M12,14 H88 V62 H42 L26,86 L32,62 H12 Z" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
    ),
  },
  {
    id: 'cylinder',
    label: 'Cylinder / Can',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <>
        <path d="M16,20 V80 A34 12 0 0 0 84 80 V20" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <ellipse cx="50" cy="20" rx="34" ry="12" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'cube',
    label: 'Cube / Box',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <>
        <polygon points="20,35 70,35 70,85 20,85" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
        <polygon points="20,35 35,18 85,18 70,35" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
        <polygon points="70,35 85,18 85,68 70,85" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'cloud',
    label: 'Cloud',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M28,72 C14,72 12,54 26,52 C24,36 48,30 54,44 C60,34 82,38 78,54 C92,56 90,72 76,72 Z" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
    ),
  },
  {
    id: 'heart',
    label: 'Heart',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M50,86 C16,60 12,34 30,24 C42,17 50,28 50,34 C50,28 58,17 70,24 C88,34 84,60 50,86 Z" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
    ),
  },
  {
    id: 'semicircle',
    label: 'Semicircle',
    category: 'Basic Shapes',
    render: (stroke, strokeWidth, fill) => (
      <path d="M8,70 A42 42 0 0 1 92 70 Z" fill={fill} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
    ),
  },

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
  {
    id: 'diode',
    label: 'Diode',
    category: 'Electrical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <line x1="10" y1="50" x2="38" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <polygon points="38,32 38,68 66,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
        <line x1="66" y1="30" x2="66" y2="70" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="66" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'switch',
    label: 'Switch (SPST)',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="10" y1="50" x2="32" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <circle cx="32" cy="50" r="3" fill={stroke} />
        <line x1="32" y1="50" x2="66" y2="30" stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinecap="round" />
        <circle cx="68" cy="50" r="3" fill={stroke} />
        <line x1="68" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'battery',
    label: 'Battery',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="10" y1="50" x2="38" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="38" y1="30" x2="38" y2="70" stroke={stroke} strokeWidth={sw(strokeWidth * 2)} />
        <line x1="48" y1="40" x2="48" y2="60" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="58" y1="30" x2="58" y2="70" stroke={stroke} strokeWidth={sw(strokeWidth * 2)} />
        <line x1="68" y1="40" x2="68" y2="60" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="68" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'dc_motor',
    label: 'Motor',
    category: 'Electrical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="30" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="58" fill={stroke} fontSize="22" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">M</text>
        <line x1="10" y1="50" x2="20" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="80" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'lamp',
    label: 'Lamp',
    category: 'Electrical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="22" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <line x1="34" y1="34" x2="66" y2="66" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="66" y1="34" x2="34" y2="66" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="6" y1="50" x2="28" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="72" y1="50" x2="94" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'ac_source',
    label: 'AC Source',
    category: 'Electrical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="30" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <path d="M34,50 Q42,32 50,50 T66,50" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="10" y1="50" x2="20" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="80" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'transformer',
    label: 'Transformer',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <>
        <path d="M30,18 C16,18 16,34 30,34 C16,34 16,50 30,50 C16,50 16,66 30,66 C16,66 16,82 30,82" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <path d="M70,18 C84,18 84,34 70,34 C84,34 84,50 70,50 C84,50 84,66 70,66 C84,66 84,82 70,82" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="46" y1="16" x2="46" y2="84" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="54" y1="16" x2="54" y2="84" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="30" y1="18" x2="20" y2="18" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="30" y1="82" x2="20" y2="82" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="70" y1="18" x2="80" y2="18" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="70" y1="82" x2="80" y2="82" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'transistor',
    label: 'Transistor (NPN)',
    category: 'Electrical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="10" y1="50" x2="38" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="38" y1="32" x2="38" y2="68" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
        <line x1="38" y1="40" x2="68" y2="22" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="38" y1="60" x2="68" y2="78" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="68" y1="22" x2="68" y2="10" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="68" y1="78" x2="68" y2="90" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <polygon points="68,78 57,71 63,82" fill={stroke} stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'level_sensor',
    label: 'Level Sensor',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="57" fill={stroke} fontSize="20" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">L</text>
        <line x1="25" y1="50" x2="10" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'humidity_sensor',
    label: 'Humidity Sensor',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <text x="50" y="57" fill={stroke} fontSize="15" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">RH</text>
        <line x1="25" y1="50" x2="10" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'indicator',
    label: 'Indicator (ISA)',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="25" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <line x1="25" y1="50" x2="75" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} opacity="0.5" />
        <text x="50" y="44" fill={stroke} fontSize="15" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold">I</text>
        <line x1="50" y1="25" x2="50" y2="10" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'thermocouple',
    label: 'Thermocouple',
    category: 'Sensors & Gauges',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="10" y1="28" x2="50" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="10" y1="72" x2="50" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="50" y1="50" x2="90" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'spring',
    label: 'Spring',
    category: 'Mechanical',
    render: (stroke, strokeWidth) => (
      <polyline points="8,50 20,50 26,34 38,66 50,34 62,66 74,34 80,50 92,50" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} strokeLinejoin="round" />
    ),
  },
  {
    id: 'damper',
    label: 'Damper (Dashpot)',
    category: 'Mechanical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="8" y1="50" x2="40" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <path d="M40,34 H62 V66 H40" fill="none" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="56" y1="38" x2="56" y2="62" stroke={stroke} strokeWidth={sw(strokeWidth * 2)} />
        <line x1="56" y1="50" x2="92" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'fixed_support',
    label: 'Fixed Support',
    category: 'Mechanical',
    render: (stroke, strokeWidth) => (
      <>
        <line x1="20" y1="40" x2="80" y2="40" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
        <path d="M24,40 L14,55 M40,40 L30,55 M56,40 L46,55 M72,40 L62,55 M88,40 L78,55" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'roller_support',
    label: 'Roller Support',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <polygon points="50,20 28,62 72,62" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
        <circle cx="34" cy="74" r="8" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <circle cx="66" cy="74" r="8" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <line x1="20" y1="86" x2="80" y2="86" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'flywheel',
    label: 'Flywheel',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="34" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} fill={fill} />
        <circle cx="50" cy="50" r="8" stroke={stroke} strokeWidth={sw(strokeWidth)} fill="none" />
        <path d="M50,16 V42 M50,58 V84 M16,50 H42 M58,50 H84" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'lever',
    label: 'Lever / Beam',
    category: 'Mechanical',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect x="10" y="42" width="80" height="10" rx="3" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <polygon points="50,60 42,80 58,80" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'fan',
    label: 'Fan / Blower',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <circle cx="50" cy="50" r="34" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <path d="M50,50 Q40,22 58,28 Z M50,50 Q78,40 72,58 Z M50,50 Q60,78 42,72 Z M50,50 Q22,60 28,42 Z" fill={stroke} opacity="0.7" stroke="none" />
        <circle cx="50" cy="50" r="5" fill={stroke} />
      </>
    ),
  },
  {
    id: 'check_valve',
    label: 'Check Valve',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <line x1="6" y1="50" x2="30" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <polygon points="30,30 30,70 64,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
        <line x1="64" y1="28" x2="64" y2="72" stroke={stroke} strokeWidth={sw(strokeWidth * 1.5)} />
        <line x1="64" y1="50" x2="94" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'filter',
    label: 'Filter / Strainer',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <rect x="25" y="25" width="50" height="50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} />
        <path d="M30,30 L70,70 M42,28 L72,58 M28,42 L58,72" stroke={stroke} strokeWidth={sw(strokeWidth)} opacity="0.7" />
        <line x1="6" y1="50" x2="25" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="75" y1="50" x2="94" y2="50" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
  {
    id: 'three_way_valve',
    label: '3-Way Valve',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <polygon points="10,30 10,70 50,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
        <polygon points="90,30 90,70 50,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
        <polygon points="30,90 70,90 50,50" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'cooling_tower',
    label: 'Cooling Tower',
    category: 'Thermo-fluid',
    render: (stroke, strokeWidth, fill) => (
      <>
        <path d="M28,15 L40,50 L28,85 H72 L60,50 L72,15 Z" stroke={stroke} strokeWidth={sw(strokeWidth)} fill={fill} strokeLinejoin="round" />
        <line x1="0" y1="80" x2="28" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
        <line x1="72" y1="80" x2="100" y2="80" stroke={stroke} strokeWidth={sw(strokeWidth)} />
      </>
    ),
  },
]

export function libraryIcon(id: string): LibraryIcon | undefined {
  return LIBRARY_ICONS.find((icon) => icon.id === id)
}
