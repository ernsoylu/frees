// Visual diagrams for documentation

// Common visual styling tokens
const THEME = {
  bg: 'transparent',
  gridColor: '#2C2E33',
  textColor: '#C1C2C5',
  textDimmed: '#909296',
  primary: '#228BE6',      // Blue
  primaryGrad: 'url(#blueGrad)',
  secondary: '#7950F2',    // Grape / Purple
  secondaryGrad: 'url(#purpleGrad)',
  accent: '#12B886',       // Teal / Green
  accentGrad: 'url(#tealGrad)',
  warning: '#FD7E14',      // Orange
  warningGrad: 'url(#orangeGrad)',
  danger: '#FA5252',       // Red
  dangerGrad: 'url(#redGrad)',
  strokeWidth: 2,
};

export function SolverPipelineDiagram() {
  return (
    <svg viewBox="0 0 800 240" width="100%" height="auto" style={{ background: THEME.bg, fontFamily: 'system-ui, sans-serif' }}>
      <defs>
        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#339AF0" />
          <stop offset="100%" stopColor="#1C7ED6" />
        </linearGradient>
        <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8F78F3" />
          <stop offset="100%" stopColor="#7048E8" />
        </linearGradient>
        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#20C997" />
          <stop offset="100%" stopColor="#0CA678" />
        </linearGradient>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill={THEME.textColor} />
        </marker>
        <marker id="loopArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill={THEME.secondary} />
        </marker>
      </defs>

      {/* Grid Background */}
      <rect width="100%" height="100%" fill="none" />

      {/* Steps */}
      {/* 1. Equations Input */}
      <g transform="translate(15, 60)">
        <rect width="110" height="70" rx="8" fill={THEME.primaryGrad} stroke="#4DABF7" strokeWidth="1" />
        <text x="55" y="32" fill="#FFF" fontWeight="600" fontSize="13" textAnchor="middle">1. Code Editor</text>
        <text x="55" y="48" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">P*V = m*R*T</text>
        <text x="55" y="60" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Equation Input</text>
      </g>

      <line x1="125" y1="95" x2="150" y2="95" stroke={THEME.textColor} strokeWidth={THEME.strokeWidth} markerEnd="url(#arrow)" />

      {/* 2. AST Parser */}
      <g transform="translate(155, 60)">
        <rect width="110" height="70" rx="8" fill={THEME.primaryGrad} stroke="#4DABF7" strokeWidth="1" />
        <text x="55" y="32" fill="#FFF" fontWeight="600" fontSize="13" textAnchor="middle">2. ANTLR Parser</text>
        <text x="55" y="48" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Abstract Syntax</text>
        <text x="55" y="60" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Tree (AST)</text>
      </g>

      <line x1="265" y1="95" x2="290" y2="95" stroke={THEME.textColor} strokeWidth={THEME.strokeWidth} markerEnd="url(#arrow)" />

      {/* 3. Tarjan SCC Block Separation */}
      <g transform="translate(295, 60)">
        <rect width="120" height="70" rx="8" fill={THEME.secondaryGrad} stroke="#9775FA" strokeWidth="1" />
        <text x="60" y="32" fill="#FFF" fontWeight="600" fontSize="13" textAnchor="middle">3. Tarjan SCC</text>
        <text x="60" y="48" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Dependency Graph</text>
        <text x="60" y="60" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Equation Blocks</text>
      </g>

      <line x1="415" y1="95" x2="440" y2="95" stroke={THEME.textColor} strokeWidth={THEME.strokeWidth} markerEnd="url(#arrow)" />

      {/* 4. Newton-Raphson Solver */}
      <g transform="translate(445, 60)">
        <rect width="125" height="70" rx="8" fill={THEME.secondaryGrad} stroke="#9775FA" strokeWidth="1" />
        <text x="62.5" y="32" fill="#FFF" fontWeight="600" fontSize="13" textAnchor="middle">4. Newton Solver</text>
        <text x="62.5" y="48" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Iterative Jacobian</text>
        <text x="62.5" y="60" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Simultaneous Solve</text>
      </g>

      <line x1="570" y1="95" x2="595" y2="95" stroke={THEME.textColor} strokeWidth={THEME.strokeWidth} markerEnd="url(#arrow)" />

      {/* 5. DYNAMIC pass */}
      <g transform="translate(600, 60)">
        <rect width="110" height="70" rx="8" fill={THEME.accentGrad} stroke="#63E6BE" strokeWidth="1" />
        <text x="55" y="32" fill="#FFF" fontWeight="600" fontSize="13" textAnchor="middle">5. DYNAMIC Pass</text>
        <text x="55" y="48" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Numerical ODE</text>
        <text x="55" y="60" fill="#FFF" fontSize="10" opacity="0.85" textAnchor="middle">Time-series Plot</text>
      </g>

      <line x1="710" y1="95" x2="735" y2="95" stroke={THEME.textColor} strokeWidth={THEME.strokeWidth} markerEnd="url(#arrow)" />

      {/* 6. Results */}
      <circle cx="765" cy="95" r="25" fill="#10B981" stroke="#34D399" strokeWidth="1" />
      <text x="765" y="99" fill="#FFF" fontWeight="600" fontSize="12" textAnchor="middle">SOLVED</text>

      {/* Iterative feedback loop arrow */}
      {/* Path from DYNAMIC pass back to Newton solver if accessors require it */}
      <path d="M 655,130 C 655,185 507,185 507,135" fill="none" stroke={THEME.secondary} strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#loopArrow)" />
      <text x="581" y="195" fill={THEME.secondary} fontSize="10" fontWeight="600" textAnchor="middle">Implicit Accessor Loop (FinalValue, MaxValue)</text>
    </svg>
  );
}

export function DegreesOfFreedomDiagram() {
  return (
    <svg viewBox="0 0 800 280" width="100%" height="auto" style={{ background: THEME.bg, fontFamily: 'system-ui, sans-serif' }}>
      <defs>
        <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#E03131" />
        </linearGradient>
        <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#51CF66" />
          <stop offset="100%" stopColor="#2B8A3E" />
        </linearGradient>
        <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF922B" />
          <stop offset="100%" stopColor="#D9480F" />
        </linearGradient>
      </defs>

      {/* 1. Underdetermined (DoF > 0) */}
      <g transform="translate(40, 20)">
        <rect width="210" height="150" rx="8" fill="#1A1B1E" stroke="#373A40" strokeWidth="1.5" />
        <text x="105" y="30" fill={THEME.warning} fontSize="13" fontWeight="bold" textAnchor="middle">Underdetermined (DoF &gt; 0)</text>
        <line x1="20" y1="105" x2="190" y2="125" stroke={THEME.textColor} strokeWidth="4" />
        <polygon points="105,75 85,110 125,110" fill={THEME.warningGrad} /> {/* Scale pivot */}
        {/* Scale pans */}
        <circle cx="20" cy="105" r="10" fill={THEME.textColor} /> {/* Unknowns (heavy) */}
        <circle cx="190" cy="125" r="10" fill={THEME.textColor} /> {/* Equations (light) */}
        <text x="20" y="88" fill={THEME.textColor} fontSize="9" textAnchor="middle" fontWeight="bold">Variables (3)</text>
        <text x="190" y="108" fill={THEME.textColor} fontSize="9" textAnchor="middle" fontWeight="bold">Equations (2)</text>
        <text x="105" y="142" fill={THEME.textDimmed} fontSize="10" textAnchor="middle">Too many unknowns.</text>
        <text x="105" y="156" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle">Action: Fix one variable</text>
      </g>

      {/* 2. Solvable (DoF = 0) */}
      <g transform="translate(295, 20)">
        <rect width="210" height="150" rx="8" fill="#1A1B1E" stroke="#373A40" strokeWidth="1.5" />
        <text x="105" y="30" fill={THEME.accent} fontSize="13" fontWeight="bold" textAnchor="middle">Exactly Determined (DoF = 0)</text>
        <line x1="20" y1="110" x2="190" y2="110" stroke={THEME.textColor} strokeWidth="4" />
        <polygon points="105,75 85,110 125,110" fill={THEME.accentGrad} /> {/* Scale pivot */}
        {/* Scale pans */}
        <circle cx="20" cy="110" r="10" fill={THEME.textColor} />
        <circle cx="190" cy="110" r="10" fill={THEME.textColor} />
        <text x="20" y="93" fill={THEME.textColor} fontSize="9" textAnchor="middle" fontWeight="bold">Variables (2)</text>
        <text x="190" y="93" fill={THEME.textColor} fontSize="9" textAnchor="middle" fontWeight="bold">Equations (2)</text>
        <text x="105" y="142" fill={THEME.textDimmed} fontSize="10" textAnchor="middle">Perfectly balanced.</text>
        <text x="105" y="156" fill={THEME.accent} fontSize="10" fontWeight="bold" textAnchor="middle">System Solvable!</text>
      </g>

      {/* 3. Overdetermined (DoF < 0) */}
      <g transform="translate(550, 20)">
        <rect width="210" height="150" rx="8" fill="#1A1B1E" stroke="#373A40" strokeWidth="1.5" />
        <text x="105" y="30" fill="#FA5252" fontSize="13" fontWeight="bold" textAnchor="middle">Overdetermined (DoF &lt; 0)</text>
        <line x1="20" y1="125" x2="190" y2="105" stroke={THEME.textColor} strokeWidth="4" />
        <polygon points="105,75 85,110 125,110" fill={THEME.dangerGrad} /> {/* Scale pivot */}
        {/* Scale pans */}
        <circle cx="20" cy="125" r="10" fill={THEME.textColor} /> {/* Unknowns (light) */}
        <circle cx="190" cy="105" r="10" fill={THEME.textColor} /> {/* Equations (heavy) */}
        <text x="20" y="108" fill={THEME.textColor} fontSize="9" textAnchor="middle" fontWeight="bold">Variables (2)</text>
        <text x="190" y="88" fill={THEME.textColor} fontSize="9" textAnchor="middle" fontWeight="bold">Equations (3)</text>
        <text x="105" y="142" fill={THEME.textDimmed} fontSize="10" textAnchor="middle">Conflicting equations.</text>
        <text x="105" y="156" fill="#FFF" fontSize="10" fontWeight="bold" textAnchor="middle">Action: Delete an equation</text>
      </g>

      {/* Explanation Text */}
      <rect x="40" y="190" width="720" height="70" rx="6" fill="light-dark(#F8F9FA, #25262B)" stroke="light-dark(#E9ECEF, #373A40)" strokeWidth="1" />
      <text x="60" y="215" fill={THEME.textColor} fontSize="11" fontWeight="bold">DoF Calculation Equation: DoF = Variables - Equations</text>
      <text x="60" y="235" fill={THEME.textDimmed} fontSize="10.5">Use the compiler Check (F4) to query your degree of freedom count before running solves.</text>
      <text x="60" y="248" fill={THEME.textDimmed} fontSize="10.5">Setting variable bounds or guess values in the Variable Info sheet (Ctrl+I) helps Newton convergence.</text>
    </svg>
  );
}

export function DependentPropertiesDiagram() {
  return (
    <svg viewBox="0 0 800 340" width="100%" height="auto" style={{ background: THEME.bg, fontFamily: 'system-ui, sans-serif' }}>
      <defs>
        <linearGradient id="domeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4c6ef5" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#4c6ef5" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* X and Y axes */}
      <line x1="60" y1="40" x2="60" y2="280" stroke={THEME.textColor} strokeWidth="1.5" />
      <line x1="60" y1="280" x2="750" y2="280" stroke={THEME.textColor} strokeWidth="1.5" />
      <text x="40" y="45" fill={THEME.textColor} fontSize="11" textAnchor="end" fontWeight="600">Temperature (T)</text>
      <text x="750" y="300" fill={THEME.textColor} fontSize="11" textAnchor="end" fontWeight="600">Specific Volume (v) or Enthalpy (h)</text>

      {/* Saturation Dome */}
      <path d="M 150,280 C 250,120 400,60 400,60 C 400,60 450,100 550,280" fill="url(#domeGrad)" stroke="#4C6EF5" strokeWidth="2.5" />
      <text x="400" y="50" fill="#4C6EF5" fontSize="10" textAnchor="middle" fontWeight="bold">Critical Point</text>
      <circle cx="400" cy="60" r="4" fill="#4C6EF5" />

      {/* Phase zones */}
      <text x="210" y="210" fill={THEME.textDimmed} fontSize="11" textAnchor="middle" fontStyle="italic">Compressed Liquid</text>
      <text x="400" y="160" fill="#4C6EF5" fontSize="12" textAnchor="middle" fontWeight="bold">Wet Two-Phase Region</text>
      <text x="590" y="210" fill={THEME.textDimmed} fontSize="11" textAnchor="middle" fontStyle="italic">Superheated Vapor</text>

      {/* Constant Pressure Isobar (e.g. 101.3 kPa) */}
      <path d="M 80,270 L 250,150 L 485,150 L 700,50" fill="none" stroke="#FD7E14" strokeWidth="2" />
      <text x="690" y="45" fill="#FD7E14" fontSize="10.5" fontWeight="bold">Isobar (P = const)</text>

      {/* Inside the Dome: Boiling flat region */}
      <circle cx="350" cy="150" r="4" fill="#E03131" />
      <text x="350" y="140" fill={THEME.textColor} fontSize="10" textAnchor="middle" fontWeight="600">Boiling State Point</text>
      <path d="M 350,150 L 350,280" stroke="#E03131" strokeWidth="1.5" strokeDasharray="3,3" />
      <text x="350" y="293" fill={THEME.textColor} fontSize="9.5" textAnchor="middle">v (known value)</text>

      <path d="M 350,150 L 60,150" stroke="#FA5252" strokeWidth="1.5" strokeDasharray="3,3" />
      <text x="50" y="154" fill="#FA5252" fontSize="9.5" textAnchor="end" fontWeight="bold">T_sat = 100°C</text>

      {/* Label explaining why T & P are dependent inside the dome */}
      <rect x="420" y="210" width="310" height="60" rx="4" fill="#25262B" stroke="#E03131" strokeWidth="1" />
      <text x="430" y="228" fill="#FF8787" fontSize="11" fontWeight="bold">⚠️ Boiling Fluid Gotcha:</text>
      <text x="430" y="245" fill={THEME.textColor} fontSize="10">Inside the dome, T determines P (and vice versa).</text>
      <text x="430" y="258" fill={THEME.textColor} fontSize="10">Pass quality (x) or enthalpy (h), NOT T and P.</text>
    </svg>
  );
}

export function GuessConvergenceDiagram() {
  return (
    <svg viewBox="0 0 800 340" width="100%" height="auto" style={{ background: THEME.bg, fontFamily: 'system-ui, sans-serif' }}>
      <defs>
        <marker id="tangentArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill="#7950F2" />
        </marker>
      </defs>

      {/* Grid line axes */}
      <line x1="50" y1="280" x2="750" y2="280" stroke={THEME.textColor} strokeWidth="1.5" />
      <line x1="80" y1="30" x2="80" y2="300" stroke={THEME.textColor} strokeWidth="1.5" />
      <text x="70" y="35" fill={THEME.textColor} fontSize="11" textAnchor="end" fontWeight="600">Residual f(x)</text>
      <text x="750" y="295" fill={THEME.textColor} fontSize="11" textAnchor="end" fontWeight="600">Variable (x)</text>

      {/* Curve f(x) */}
      <path d="M 120,280 Q 250,20 400,20 T 650,220" fill="none" stroke="#228BE6" strokeWidth="3" />
      <text x="610" y="190" fill="#228BE6" fontSize="12" fontWeight="bold">Residual Curve f(x) = 0</text>

      {/* Root (f(x) = 0) */}
      <circle cx="160" cy="280" r="5" fill="#10B981" />
      <text x="160" y="295" fill="#10B981" fontSize="10.5" fontWeight="bold" textAnchor="middle">True Root (f(x)=0)</text>

      {/* Bad Guess Divergence Visual */}
      <g>
        <circle cx="400" cy="20" r="4" fill="#FA5252" />
        <text x="400" y="10" fill="#FA5252" fontSize="10.5" fontWeight="bold" textAnchor="middle">Flat Region (Derivative ~ 0)</text>
        <line x1="400" y1="20" x2="700" y2="20" stroke="#FA5252" strokeWidth="1.5" strokeDasharray="3,3" />
        <text x="710" y="24" fill="#FA5252" fontSize="9.5" fontWeight="bold">Diverges / Division by Zero!</text>
      </g>

      {/* Good Guess Iteration Visual */}
      <g>
        {/* Step 1: Guess x0 */}
        <circle cx="550" cy="115" r="4" fill="#7950F2" />
        <line x1="550" y1="115" x2="550" y2="280" stroke={THEME.textDimmed} strokeWidth="1" strokeDasharray="3,3" />
        <text x="550" y="295" fill={THEME.textColor} fontSize="10" textAnchor="middle">x0 (Good Guess)</text>

        {/* Tangent line at x0 */}
        <line x1="600" y1="171" x2="330" y2="-12" stroke="#7950F2" strokeWidth="1.5" markerEnd="url(#tangentArrow)" />
        <text x="495" y="80" fill="#7950F2" fontSize="9.5" fontWeight="bold" transform="rotate(31, 495, 80)">Tangent f'(x0)</text>

        {/* Step 2: Next iteration x1 */}
        <circle cx="340" cy="280" r="4" fill="#7950F2" />
        <text x="340" y="295" fill={THEME.textColor} fontSize="10" textAnchor="middle">x1</text>
        <path d="M 540,270 Q 440,250 350,275" fill="none" stroke="#7950F2" strokeWidth="1.5" strokeDasharray="2,2" />
      </g>

      {/* Explanatory notes */}
      <rect x="230" y="60" width="340" height="70" rx="4" fill="#25262B" stroke="#373A40" strokeWidth="1" />
      <text x="245" y="78" fill="#B197FC" fontSize="11" fontWeight="bold">Why Setup Bounds and Initial Guesses?</text>
      <text x="245" y="96" fill={THEME.textColor} fontSize="10">1. Bounds (e.g. x &gt; 0) prevent search in invalid domains.</text>
      <text x="245" y="110" fill={THEME.textColor} fontSize="10">2. Good guesses keep solver away from flat divergence regions.</text>
      <text x="245" y="124" fill={THEME.textColor} fontSize="10">3. Halves iterations and speeds up solving.</text>
    </svg>
  );
}
