// Promote auto-generated baseline pages to curated rich pages by attaching a
// standard closed-form Mathematical Formulation + citation to each function. The
// formulas are the well-known textbook forms (also present in the FunctionRegistry
// descriptions); wrapper functions with no closed form (CoolProp properties, solid
// materials, CAS ops) are finalized without a fabricated math section.
//
// Operates on the existing baseline .md files: rewrites body + frontmatter
// (drops `generated: true`, fills `references`). Hand-authored pages and pages not
// listed here are left untouched.
//
// Run: node scripts/build-doc-manifest.mjs && node scripts/enrich-functions.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, '../src/docs/reference');
const manifest = JSON.parse(fs.readFileSync(path.join(REF, 'function-manifest.json'), 'utf-8'));
const sigOf = {};
for (const f of [...manifest.functions, ...manifest.matrixFunctions]) sigOf[f.name.toLowerCase()] = f;
for (const p of manifest.callProcedures) sigOf[p.name.toLowerCase()] = p;

// Reference shorthands
const AS = 'Abramowitz, M. & Stegun, I.A., *Handbook of Mathematical Functions*';
const GVL = 'Golub, G.H. & Van Loan, C.F., *Matrix Computations* (4th ed.)';
const CENGEL_TH = 'Çengel, Y.A., Boles, M.A. & Kanoğlu, M., *Thermodynamics: An Engineering Approach*, Ch. 17';
const ANDERSON = 'Anderson, J.D., *Modern Compressible Flow* (3rd ed.)';
const COLLIER = 'Collier, J.G. & Thome, J.R., *Convective Boiling and Condensation* (3rd ed.)';
const INCROPERA = 'Incropera, F.P. et al., *Fundamentals of Heat and Mass Transfer*';
const WHITE = 'White, F.M., *Fluid Mechanics* (8th ed.)';
const MONT = 'Montgomery, D.C. & Runger, G.C., *Applied Statistics and Probability for Engineers*';
const ISA76 = 'U.S. Standard Atmosphere, 1976 (NOAA/NASA/USAF)';
const TURNS = 'Turns, S.R., *An Introduction to Combustion* (3rd ed.)';
const NR = 'Press, W.H. et al., *Numerical Recipes* (3rd ed.)';

// name -> { m: [katex lines], r: [refs] }.  `m` omitted ⇒ finalize without math.
const R = {
  // ── Elementary math ──
  abs: { m: ['|x| = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}'], r: [] },
  sign: { m: ['\\operatorname{sign}(x) = \\begin{cases} -1 & x<0 \\\\ 0 & x=0 \\\\ 1 & x>0 \\end{cases}'], r: [] },
  floor: { m: ['\\lfloor x \\rfloor = \\max\\{n \\in \\mathbb{Z} : n \\le x\\}'], r: [] },
  ceil: { m: ['\\lceil x \\rceil = \\min\\{n \\in \\mathbb{Z} : n \\ge x\\}'], r: [] },
  round: { m: ['\\operatorname{round}(x, d) = \\frac{\\lfloor x\\cdot 10^{d} + 0.5\\rfloor}{10^{d}}'], r: [] },
  trunc: { m: ['\\operatorname{trunc}(x) = \\operatorname{sign}(x)\\,\\lfloor |x| \\rfloor'], r: [] },
  mod: { m: ['\\operatorname{mod}(a,b) = a - b\\,\\lfloor a/b \\rfloor'], r: [] },
  factorial: { m: ['n! = \\prod_{k=1}^{n} k = n\\,(n-1)!', '\\quad n! = \\Gamma(n+1)'], r: [AS + ', §6.1'] },
  gcd: { m: ['\\gcd(a,b) = \\gcd(b,\\ a \\bmod b), \\qquad \\gcd(a,0)=a \\quad\\text{(Euclid)}'], r: [] },
  lcm: { m: ['\\operatorname{lcm}(a,b) = \\frac{|a\\,b|}{\\gcd(a,b)}'], r: [] },
  product: { m: ['\\prod_{i=\\text{lo}}^{\\text{hi}} \\text{term}(i)'], r: [] },
  tan: { m: ['\\tan(x) = \\frac{\\sin x}{\\cos x}, \\qquad x \\text{ in radians}'], r: [] },
  asin: { m: ['y = \\arcsin(x), \\qquad \\sin(y) = x,\\ \\ y \\in [-\\tfrac{\\pi}{2}, \\tfrac{\\pi}{2}]'], r: [] },
  acos: { m: ['y = \\arccos(x), \\qquad \\cos(y) = x,\\ \\ y \\in [0, \\pi]'], r: [] },
  atan: { m: ['y = \\arctan(x), \\qquad \\tan(y) = x'], r: [] },
  arcsin: { m: ['y = \\arcsin(x), \\qquad \\sin(y) = x,\\ \\ y \\in [-\\tfrac{\\pi}{2}, \\tfrac{\\pi}{2}]'], r: [] },
  arccos: { m: ['y = \\arccos(x), \\qquad \\cos(y) = x,\\ \\ y \\in [0, \\pi]'], r: [] },
  arctan: { m: ['y = \\arctan(x), \\qquad \\tan(y) = x'], r: [] },
  atan2: { m: ['\\operatorname{atan2}(y,x) = \\arg(x + jy) \\in (-\\pi, \\pi]'], r: [] },
  sinh: { m: ['\\sinh(x) = \\frac{e^{x} - e^{-x}}{2}'], r: [] },
  cosh: { m: ['\\cosh(x) = \\frac{e^{x} + e^{-x}}{2}'], r: [] },
  tanh: { m: ['\\tanh(x) = \\frac{\\sinh x}{\\cosh x} = \\frac{e^{x}-e^{-x}}{e^{x}+e^{-x}}'], r: [] },
  arcsinh: { m: ['\\operatorname{arcsinh}(x) = \\ln\\!\\big(x + \\sqrt{x^2+1}\\big)'], r: [] },
  arccosh: { m: ['\\operatorname{arccosh}(x) = \\ln\\!\\big(x + \\sqrt{x^2-1}\\big), \\quad x \\ge 1'], r: [] },
  arctanh: { m: ['\\operatorname{arctanh}(x) = \\tfrac12\\ln\\!\\frac{1+x}{1-x}, \\quad |x| < 1'], r: [] },
  log10: { m: ['y = \\log_{10}(x) = \\frac{\\ln x}{\\ln 10}, \\quad x > 0'], r: [] },
  bitand: { m: ['(a \\,\\&\\, b)\\ \\text{— bitwise AND of the integer operands}'], r: [] },
  bitor: { m: ['(a \\mathbin{|} b)\\ \\text{— bitwise OR of the integer operands}'], r: [] },
  bitxor: { m: ['(a \\oplus b)\\ \\text{— bitwise XOR of the integer operands}'], r: [] },
  bitnot: { m: ['(\\sim a) = -(a+1)\\ \\text{(two’s complement)}'], r: [] },
  bitshiftl: { m: ['a \\ll n = a\\cdot 2^{n}'], r: [] },
  bitshiftr: { m: ['a \\gg n = \\lfloor a / 2^{n} \\rfloor'], r: [] },
  arrayelmt: { m: ['\\operatorname{ArrayElmt}(\\{a_1,\\dots,a_n\\}, i) = a_i'], r: [] },
  baseconvert: { m: ['\\operatorname{baseconvert}(s) = \\text{numeric value of the based literal } s \\ (\\text{e.g. } \\mathtt{0xFF} \\to 255)'], r: [] },

  // ── Complex ──
  real: { m: ['\\Re(z) = \\Re(a + jb) = a'], r: [] },
  imag: { m: ['\\Im(z) = \\Im(a + jb) = b'], r: [] },
  conj: { m: ['\\bar z = \\overline{a + jb} = a - jb'], r: [] },
  magnitude: { m: ['|z| = \\sqrt{a^2 + b^2}'], r: [] },
  angle: { m: ['\\arg(z) = \\operatorname{atan2}(b, a)\\ \\ [\\text{rad}]'], r: [] },
  angledeg: { m: ['\\arg(z) = \\operatorname{atan2}(b, a)\\cdot\\tfrac{180}{\\pi}\\ \\ [\\text{deg}]'], r: [] },
  cis: { m: ['\\operatorname{cis}(\\theta) = e^{j\\theta} = \\cos\\theta + j\\sin\\theta'], r: [] },

  // ── Statistics ──
  mean: { m: ['\\bar x = \\frac{1}{n}\\sum_{i=1}^{n} x_i'], r: [MONT] },
  average: { m: ['\\bar x = \\frac{1}{n}\\sum_{i=1}^{n} x_i'], r: [MONT] },
  median: { m: ['\\text{the middle order statistic (mean of the two middle values if } n \\text{ even)}'], r: [MONT] },
  sum: { m: ['\\sum_{i=1}^{n} x_i'], r: [] },
  std: { m: ['s = \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar x)^2}'], r: [MONT] },
  var: { m: ['s^2 = \\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar x)^2'], r: [MONT] },
  rms: { m: ['x_{\\text{rms}} = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n} x_i^2}'], r: [] },
  percentile: { m: ['P_p = \\text{value below which } p\\% \\text{ of the data fall (linear interpolation)}'], r: [MONT] },
  probability: { m: ['\\Pr(X \\le x) = \\Phi\\!\\left(\\frac{x-\\mu}{\\sigma}\\right)'], r: [MONT] },
  normalcdf: { m: ['\\Phi(x;\\mu,\\sigma) = \\tfrac12\\left[1 + \\operatorname{erf}\\!\\frac{x-\\mu}{\\sigma\\sqrt2}\\right]'], r: [MONT] },
  normalpdf: { m: ['\\phi(x;\\mu,\\sigma) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-(x-\\mu)^2/(2\\sigma^2)}'], r: [MONT] },
  normalinvcdf: { m: ['x = \\Phi^{-1}(p;\\mu,\\sigma) = \\mu + \\sigma\\sqrt2\\,\\operatorname{erf}^{-1}(2p-1)'], r: [MONT] },
  chi_square: { m: ['F(x; k) = \\frac{\\gamma(k/2,\\ x/2)}{\\Gamma(k/2)} \\quad\\text{(chi-square CDF, } k \\text{ d.o.f.)}'], r: [MONT] },
  random: { m: ['X \\sim \\mathcal{U}(a, b), \\qquad X = a + (b-a)\\,U,\\ \\ U\\in[0,1)'], r: [] },
  randg: { m: ['X \\sim \\mathcal{N}(\\mu, \\sigma^2)'], r: [MONT] },
  slope: { m: ['m = \\frac{\\sum (x_i-\\bar x)(y_i-\\bar y)}{\\sum (x_i-\\bar x)^2} \\quad\\text{(least squares)}'], r: [MONT] },
  intercept: { m: ['b = \\bar y - m\\,\\bar x'], r: [MONT] },
  r2: { m: ['R^2 = 1 - \\frac{\\sum (y_i - \\hat y_i)^2}{\\sum (y_i - \\bar y)^2}'], r: [MONT] },

  // ── Matrix / linear algebra ──
  solvelinear: { m: ['A\\,x = b \\;\\Rightarrow\\; x = A^{-1}b \\quad\\text{(via } PA = LU\\text{, forward/back substitution)}'], r: [GVL + ', §3.2'] },
  inverse: { m: ['A\\,A^{-1} = A^{-1}A = I'], r: [GVL] },
  inv: { m: ['A\\,A^{-1} = A^{-1}A = I'], r: [GVL] },
  determinant: { m: ['\\det(A) = \\sum_{\\sigma} \\operatorname{sgn}(\\sigma)\\prod_i A_{i,\\sigma(i)} = \\pm\\prod_i U_{ii}'], r: [GVL] },
  det: { m: ['\\det(A) = \\pm\\prod_i U_{ii} \\quad\\text{(from } PA = LU\\text{)}'], r: [GVL] },
  trace: { m: ['\\operatorname{tr}(A) = \\sum_i A_{ii} = \\sum_i \\lambda_i'], r: [GVL] },
  transpose: { m: ['(A^\\top)_{ij} = A_{ji}'], r: [] },
  dot: { m: ['a \\cdot b = \\sum_i a_i b_i'], r: [] },
  cross: { m: ['a \\times b = (a_2 b_3 - a_3 b_2,\\ a_3 b_1 - a_1 b_3,\\ a_1 b_2 - a_2 b_1)'], r: [] },
  norm: { m: ['\\lVert v \\rVert_2 = \\sqrt{\\textstyle\\sum_i v_i^2}'], r: [GVL] },
  eig: { m: ['A v = \\lambda v, \\qquad \\det(A - \\lambda I) = 0'], r: [GVL + ', Ch. 7'] },
  eigvec: { m: ['A v_i = \\lambda_i v_i \\quad\\text{(columns are the eigenvectors)}'], r: [GVL + ', Ch. 7'] },
  rank: { m: ['\\operatorname{rank}(A) = \\#\\{\\sigma_i > \\text{tol}\\} \\quad\\text{(numerical, via SVD)}'], r: [GVL] },
  svd: { m: ['A = U\\,\\Sigma\\,V^\\top, \\qquad \\Sigma = \\operatorname{diag}(\\sigma_1 \\ge \\dots \\ge \\sigma_r > 0)'], r: [GVL + ', §2.4'] },
  qr: { m: ['A = Q\\,R, \\qquad Q^\\top Q = I,\\ R\\ \\text{upper triangular}'], r: [GVL + ', §5.2'] },
  cholesky: { m: ['A = L\\,L^\\top \\quad\\text{(} A \\text{ symmetric positive-definite)}'], r: [GVL + ', §4.2'] },
  matexp: { m: ['e^{A} = \\sum_{k=0}^{\\infty} \\frac{A^{k}}{k!}'], r: [GVL + ', §9.3'] },
  zeros: { m: ['Z_{ij} = 0 \\quad (m\\times n)'], r: [] },
  ones: { m: ['J_{ij} = 1 \\quad (m\\times n)'], r: [] },
  eye: { m: ['I_{ij} = \\delta_{ij} \\quad (n\\times n)'], r: [] },
  linspace: { m: ['x_k = a + (b-a)\\,\\frac{k-1}{n-1}, \\quad k = 1,\\dots,n'], r: [] },
  axpy: { m: ['y \\leftarrow \\alpha x + y \\quad\\text{(BLAS level 1)}'], r: [] },
  gemv: { m: ['y \\leftarrow \\alpha A x + \\beta y \\quad\\text{(BLAS level 2)}'], r: [] },
  gemm: { m: ['C \\leftarrow \\alpha A B + \\beta C \\quad\\text{(BLAS level 3)}'], r: [] },

  // ── Compressible flow ──
  rho0_rho: { m: ['\\frac{\\rho_0}{\\rho} = \\left(1 + \\tfrac{k-1}{2}M^2\\right)^{1/(k-1)}'], r: [CENGEL_TH + ', Eq. (17-20)'] },
  a_astar: { m: ['\\frac{A}{A^*} = \\frac{1}{M}\\left[\\frac{2}{k+1}\\left(1 + \\tfrac{k-1}{2}M^2\\right)\\right]^{(k+1)/[2(k-1)]}'], r: [CENGEL_TH + ', Eq. (17-26)'] },
  t2_t1_shock: { m: ['\\frac{T_2}{T_1} = \\frac{\\big[1 + \\tfrac{k-1}{2}M_1^2\\big]\\big[\\tfrac{2k}{k-1}M_1^2 - 1\\big]}{M_1^2\\,(k+1)^2/[2(k-1)]}'], r: [CENGEL_TH + ', Eq. (17-37)'] },
  rho2_rho1_shock: { m: ['\\frac{\\rho_2}{\\rho_1} = \\frac{(k+1)M_1^2}{2 + (k-1)M_1^2}'], r: [CENGEL_TH + ', Eq. (17-36)'] },
  prandtlmeyer: { m: ['\\nu(M) = \\sqrt{\\tfrac{k+1}{k-1}}\\,\\arctan\\!\\sqrt{\\tfrac{k-1}{k+1}(M^2-1)} - \\arctan\\!\\sqrt{M^2-1}'], r: [ANDERSON + ', Ch. 4'] },
  mach_prandtlmeyer: { m: ['\\text{solve } \\nu(M) = \\nu_{\\text{target}} \\text{ for } M \\quad (M \\ge 1)'], r: [ANDERSON + ', Ch. 4'] },
  machangle: { m: ['\\mu = \\arcsin\\!\\frac{1}{M}'], r: [ANDERSON + ', Ch. 4'] },
  theta_oblique: { m: ['\\tan\\theta = 2\\cot\\beta\\,\\frac{M_1^2\\sin^2\\beta - 1}{M_1^2(k + \\cos 2\\beta) + 2}'], r: [ANDERSON + ', Ch. 4'] },
  beta_oblique: { m: ['\\text{solve the } \\theta\\text{-}\\beta\\text{-}M \\text{ relation for the wave angle } \\beta \\ (\\text{weak/strong root})'], r: [ANDERSON + ', Ch. 4'] },
  rayleigh_t0_t0star: { m: ['\\frac{T_0}{T_0^*} = \\frac{(k+1)M^2\\,[2 + (k-1)M^2]}{(1 + kM^2)^2}'], r: [CENGEL_TH + ', Ch. 17 (Rayleigh)'] },
  rayleigh_t_tstar: { m: ['\\frac{T}{T^*} = \\left(\\frac{(k+1)M}{1 + kM^2}\\right)^2'], r: [CENGEL_TH + ', Ch. 17 (Rayleigh)'] },
  rayleigh_p_pstar: { m: ['\\frac{P}{P^*} = \\frac{k+1}{1 + kM^2}'], r: [CENGEL_TH + ', Ch. 17 (Rayleigh)'] },
  rayleigh_p0_p0star: { m: ['\\frac{P_0}{P_0^*} = \\frac{k+1}{1+kM^2}\\left[\\frac{2 + (k-1)M^2}{k+1}\\right]^{k/(k-1)}'], r: [CENGEL_TH + ', Ch. 17 (Rayleigh)'] },
  fanno_t_tstar: { m: ['\\frac{T}{T^*} = \\frac{k+1}{2 + (k-1)M^2}'], r: [CENGEL_TH + ', Ch. 17 (Fanno)'] },
  fanno_p_pstar: { m: ['\\frac{P}{P^*} = \\frac{1}{M}\\sqrt{\\frac{k+1}{2 + (k-1)M^2}}'], r: [CENGEL_TH + ', Ch. 17 (Fanno)'] },
  fanno_p0_p0star: { m: ['\\frac{P_0}{P_0^*} = \\frac{1}{M}\\left[\\frac{2 + (k-1)M^2}{k+1}\\right]^{(k+1)/[2(k-1)]}'], r: [CENGEL_TH + ', Ch. 17 (Fanno)'] },
  fanno_fld: { m: ['\\frac{4 f L^*}{D} = \\frac{1-M^2}{kM^2} + \\frac{k+1}{2k}\\ln\\frac{(k+1)M^2}{2 + (k-1)M^2}'], r: [CENGEL_TH + ', Ch. 17 (Fanno)'] },

  // ── Flow networks ──
  reynolds: { m: ['Re = \\frac{\\rho V D}{\\mu}'], r: [WHITE] },
  minor_loss: { m: ['\\Delta P = K\\,\\tfrac12\\rho V^2'], r: [WHITE] },
  friction_factor: { m: ['\\frac{1}{\\sqrt{f}} = -2\\log_{10}\\!\\left(\\frac{\\varepsilon/D}{3.7} + \\frac{2.51}{Re\\sqrt{f}}\\right) \\quad\\text{(Colebrook; } f = 64/Re \\text{ laminar)}'], r: [WHITE, 'Colebrook, C.F. (1939), J. Inst. Civ. Eng. 11:133'] },

  // ── Pneumatics ──
  iso6358: { m: ['\\dot m = C\\,\\rho_0\\,P_{up}\\sqrt{\\tfrac{T_0}{T_{up}}}\\cdot\\begin{cases} 1 & P_{down}/P_{up} \\le b \\\\ \\sqrt{1 - \\big(\\tfrac{P_{down}/P_{up} - b}{1-b}\\big)^2} & \\text{else} \\end{cases}'], r: ['ISO 6358 — Pneumatic fluid power: flow-rate characteristics'] },

  // ── Atmosphere (ISA 1976) ──
  isa_t: { m: ['T(h) = T_b + L_b\\,(h - h_b) \\quad\\text{(layer lapse rate } L_b)'], r: [ISA76] },
  isa_p: { m: ['P(h) = P_b\\left(\\frac{T_b}{T_b + L_b(h-h_b)}\\right)^{g_0 M/(R L_b)} \\quad (L_b \\ne 0)'], r: [ISA76] },
  isa_rho: { m: ['\\rho(h) = \\frac{P(h)\\,M}{R\\,T(h)}'], r: [ISA76] },

  // ── Two-phase flow ──
  lm_phi2: { m: ['\\phi_l^2 = 1 + \\frac{C}{X} + \\frac{1}{X^2} \\quad\\text{(Chisholm)}'], r: [COLLIER + ', Eq. (2.68)'] },
  lm_martinelli_tt: { m: ['X_{tt} = \\left(\\frac{1-x}{x}\\right)^{0.9}\\left(\\frac{\\rho_g}{\\rho_l}\\right)^{0.5}\\left(\\frac{\\mu_l}{\\mu_g}\\right)^{0.1}'], r: [COLLIER + ', §2.4'] },
  void_homogeneous: { m: ['\\alpha = \\frac{1}{1 + \\frac{1-x}{x}\\frac{\\rho_g}{\\rho_l}} \\quad\\text{(no slip)}'], r: [COLLIER + ', Ch. 2'] },
  void_zivi: { m: ['\\alpha = \\frac{1}{1 + \\frac{1-x}{x}\\left(\\frac{\\rho_g}{\\rho_l}\\right)^{2/3}} \\quad\\text{(slip } S = (\\rho_l/\\rho_g)^{1/3})'], r: ['Zivi, S.M. (1964), J. Heat Transfer 86:247'] },
  void_rouhani: { m: ['\\alpha = \\frac{x}{\\rho_g}\\left[(1 + 0.12(1-x))\\left(\\frac{x}{\\rho_g} + \\frac{1-x}{\\rho_l}\\right) + \\frac{1.18(1-x)[g\\sigma(\\rho_l-\\rho_g)]^{0.25}}{G\\rho_l^{0.5}}\\right]^{-1}'], r: ['Rouhani, S.Z. & Axelsson, E. (1970), Int. J. Heat Mass Transfer 13:383'] },
  friedel_phi2: { m: ['\\phi_{lo}^2 = E + \\frac{3.24\\,F H}{Fr^{0.045}We^{0.035}} \\quad\\text{(Friedel)}'], r: [COLLIER + ', §2.5'] },
  momentum_flux: { m: ['\\left(\\frac{d P}{d z}\\right)_{\\text{acc}} = G^2\\frac{d}{dz}\\left[\\frac{x^2}{\\rho_g\\alpha} + \\frac{(1-x)^2}{\\rho_l(1-\\alpha)}\\right]'], r: [COLLIER + ', Ch. 2'] },
  nu_dittus_boelter: { m: ['Nu = 0.023\\,Re^{0.8}\\,Pr^{n} \\quad (n = 0.4 \\text{ heating},\\ 0.3 \\text{ cooling})'], r: [INCROPERA + ', Eq. (8.60)'] },
  nu_gnielinski: { m: ['Nu = \\frac{(f/8)(Re-1000)Pr}{1 + 12.7\\sqrt{f/8}\\,(Pr^{2/3}-1)}'], r: [INCROPERA + ', Eq. (8.62)'] },
  chen_f: { m: ['F = \\big[1 + X_{tt}^{-1}\\big]^{0.736} \\text{-type convective enhancement (Chen)}'], r: ['Chen, J.C. (1966), Ind. Eng. Chem. Process Des. Dev. 5:322'] },
  chen_s: { m: ['S = \\frac{1}{1 + 2.53\\times10^{-6}\\,Re_l^{1.17}} \\quad\\text{(nucleate suppression, Chen)}'], r: ['Chen, J.C. (1966), Ind. Eng. Chem. Process Des. Dev. 5:322'] },
  nu_shah: { m: ['Nu_{TP} = Nu_l\\left(1 + \\frac{3.8}{Z^{0.95}}\\right), \\quad Z = (1/x - 1)^{0.8}p_r^{0.4} \\quad\\text{(Shah)}'], r: ['Shah, M.M. (1979), Int. J. Heat Mass Transfer 22:547'] },
  nu_cavallini_zecchin: { m: ['Nu = 0.05\\,Re_{eq}^{0.8}\\,Pr_l^{0.33} \\quad\\text{(Cavallini–Zecchin condensation)}'], r: ['Cavallini, A. & Zecchin, R. (1974), 5th Int. Heat Transfer Conf.'] },
  zone_ramp: { m: ['r(L) = \\tanh\\!\\left(\\frac{L}{\\varepsilon}\\right) \\quad\\text{(smooth zone-collapse ramp)}'], r: [COLLIER] },

  // ── Heat-transfer correlations / geometry ──
  dp_1phase: { m: ['\\Delta P = f\\,\\frac{L}{D_h}\\,\\frac{G^2}{2\\rho}, \\qquad G = \\dot m / A_{\\text{flow}} \\quad\\text{(Darcy)}'], r: [WHITE] },
  dp_mueller_steinhagen: { m: ['\\frac{dP}{dz} = G_{ms}(1-x)^{1/3} + B\\,x^3, \\quad G_{ms} = A + 2(B-A)x \\quad\\text{(Müller-Steinhagen–Heck)}'], r: ['Müller-Steinhagen, H. & Heck, K. (1986), Chem. Eng. Process. 20:297'] },
  dp_compact_core: { m: ['\\frac{\\Delta P}{P_1} = \\frac{G^2}{2\\rho_1 P_1}\\left[(1+\\sigma^2)\\!\\left(\\tfrac{\\rho_1}{\\rho_2}-1\\right) + f\\tfrac{A}{A_c}\\tfrac{\\rho_1}{\\rho_m}\\right] \\quad\\text{(Kays–London core)}'], r: ['Kays, W.M. & London, A.L., *Compact Heat Exchangers* (3rd ed.), Ch. 2'] },
  dp_gravity: { m: ['\\Delta P_{\\text{grav}} = \\big[\\alpha\\rho_g + (1-\\alpha)\\rho_l\\big]\\,g\\,L\\sin\\theta'], r: [COLLIER] },
  dp_2phase_avg: { m: ['\\Delta P = \\frac{1}{n}\\sum_{i=1}^{n} \\phi_l^2(x_i)\\,\\left(\\frac{dP}{dz}\\right)_{l,i} \\Delta z \\quad\\text{(quality-integrated)}'], r: [COLLIER] },
  mass_flux: { m: ['G = \\frac{\\dot m}{A_{\\text{flow}}}'], r: [] },
  hx_dh: { m: ['D_h = \\frac{4\\,A_{\\text{flow}}\\,L}{A_{\\text{total}}}'], r: ['Kays, W.M. & London, A.L., *Compact Heat Exchangers* (3rd ed.), Ch. 2'] },
  hx_sigma: { m: ['\\sigma = \\frac{A_{\\text{flow}}}{A_{\\text{frontal}}} \\quad\\text{(free-flow / contraction ratio)}'], r: ['Kays, W.M. & London, A.L., *Compact Heat Exchangers* (3rd ed.), Ch. 2'] },
  nu_zukauskas: { m: ['Nu = C\\,Re_{\\max}^{m}\\,Pr^{0.36}\\,(Pr/Pr_w)^{1/4} \\quad\\text{(tube bank)}'], r: ['Žukauskas, A. (1972), Adv. Heat Transfer 8:93'] },
  nu_tubebank: { m: ['Nu = C\\,Re_{\\max}^{m}\\,Pr^{0.36}\\,(Pr/Pr_w)^{1/4} \\quad (C, m \\text{ by arrangement/Re band})'], r: ['Žukauskas, A. (1972), Adv. Heat Transfer 8:93'] },
  nu_colburn: { m: ['Nu = j\\,Re\\,Pr^{1/3} \\quad\\text{(Colburn } j\\text{-factor)}'], r: [INCROPERA] },
  nu_churchill_chu: { m: ['Nu = \\left\\{0.60 + \\frac{0.387\\,Ra^{1/6}}{[1 + (0.559/Pr)^{9/16}]^{8/27}}\\right\\}^2 \\quad\\text{(Churchill–Chu)}'], r: [INCROPERA + ', Eq. (9.34)'] },
  nu_blend: { m: ['Nu = \\big(Nu_1^3 + Nu_2^3\\big)^{1/3} \\quad\\text{(free+forced cubic blend)}'], r: [INCROPERA] },
  nu_hilpert: { m: ['Nu = C\\,Re^{m}\\,Pr^{1/3} \\quad\\text{(single cylinder, Hilpert)}'], r: [INCROPERA + ', Eq. (7.52)'] },
  nu_plate: { m: ['Nu = C(\\beta)\\,Re^{m}\\,Pr^{1/3} \\quad\\text{(chevron plate, angle } \\beta)'], r: ['Shah, R.K. & Sekulić, D.P., *Fundamentals of Heat Exchanger Design*, Ch. 7'] },
  nu_gungor_winterton: { m: ['Nu = Nu_l\\big[1 + 3000\\,Bo^{0.86} + 1.12(x/(1-x))^{0.75}(\\rho_l/\\rho_g)^{0.41}\\big] \\quad\\text{(Gungor–Winterton)}'], r: ['Gungor, K.E. & Winterton, R.H.S. (1986), Int. J. Heat Mass Transfer 29:351'] },
  nu_traviss: { m: ['Nu = \\frac{Pr_l\\,Re_l^{0.9}\\,F(X_{tt})}{F_2} \\quad\\text{(Traviss condensation)}'], r: ['Traviss, D.P. et al. (1973), ASHRAE Trans. 79:157'] },
  j_fin: { m: ['j = St\\,Pr^{2/3} = C\\,Re^{m} \\quad\\text{(Colburn } j \\text{ for the fin surface)}'], r: ['Kays, W.M. & London, A.L., *Compact Heat Exchangers* (3rd ed.)'] },
  f_fin: { m: ['f = C_f\\,Re^{m_f} \\quad\\text{(Fanning friction for the fin surface)}'], r: ['Kays, W.M. & London, A.L., *Compact Heat Exchangers* (3rd ed.)'] },

  // ── Calculus ──
  gaussintegral: { m: ['\\int_a^b f(x)\\,dx \\approx \\frac{b-a}{2}\\sum_{i=1}^{n} w_i\\,f\\!\\left(\\tfrac{b-a}{2}\\xi_i + \\tfrac{a+b}{2}\\right) \\quad\\text{(Gauss–Legendre)}'], r: [NR + ', §4.6'] },
  differentiate: { m: ['\\left.\\frac{dy}{dx}\\right|_{x_v} \\approx \\frac{y_{i+1}-y_{i-1}}{x_{i+1}-x_{i-1}} \\quad\\text{(central difference on the table)}'], r: [NR + ', §5.7'] },
  integralvalue: { m: ['\\int y\\,dx \\approx \\sum_i \\tfrac{y_i + y_{i+1}}{2}(x_{i+1}-x_i) \\quad\\text{(trapezoidal)}'], r: [NR + ', §4.1'] },
  uncertaintyof: { m: ['u(X) = \\text{user-supplied or RSS-propagated uncertainty of } X'], r: ['JCGM 100:2008 (GUM)'] },

  // ── Interpolation ──
  interpolate: { m: ['y = y_i + (y_{i+1}-y_i)\\frac{x - x_i}{x_{i+1} - x_i} \\quad\\text{(linear)}'], r: [NR + ', §3.1'] },
  interpolate1: { m: ['\\text{piecewise cubic spline through the table knots (} C^2 \\text{ continuous)}'], r: [NR + ', §3.3'] },
  lookup: { m: ['\\operatorname{Lookup}(t, r, c) = t_{r,c} \\quad\\text{(1-based cell)}'], r: [] },
  lookuprow: { m: ['\\text{row } r \\text{ where column } c \\text{ crosses } val \\text{ (interpolated)}'], r: [] },
  nlookuprows: { m: ['\\operatorname{NLookupRows}(t) = \\#\\text{rows}(t)'], r: [] },

  // ── Tables / ODE accessors ──
  tablevalue: { m: ['\\operatorname{TableValue}(r, c) = \\text{cell } (r, c) \\text{ of the parametric table}'], r: [] },
  'tablerun#': { m: ['\\text{current parametric run index (1-based)}'], r: [] },
  nparametricruns: { m: ['\\text{total number of configured parametric runs}'], r: [] },
  tablesum: { m: ['\\sum_{r} c_r'], r: [] },
  tablemin: { m: ['\\min_r c_r'], r: [] },
  tablemax: { m: ['\\max_r c_r'], r: [] },
  tablestddev: { m: ['s = \\sqrt{\\tfrac{1}{n-1}\\sum_r (c_r - \\bar c)^2}'], r: [] },
  minvalue: { m: ['\\min_{0 \\le i \\le N} \\text{col}(t_i)'], r: [] },
  odeavg: { m: ['\\frac{1}{N+1}\\sum_{i=0}^{N} \\text{col}(t_i)'], r: [] },
  odesum: { m: ['\\sum_{i=0}^{N} \\text{col}(t_i)'], r: [] },
  odestddev: { m: ['s = \\sqrt{\\tfrac{1}{N}\\sum_i (\\text{col}(t_i) - \\overline{\\text{col}})^2}'], r: [] },
  odemin: { m: ['\\min_i \\text{col}(t_i)'], r: [] },
  odemax: { m: ['\\max_i \\text{col}(t_i)'], r: [] },

  // ── Strings ──
  stringlen: { m: ['\\operatorname{StringLen}(s) = |s|'], r: [] },
  stringpos: { m: ['\\operatorname{StringPos}(s, t) = \\text{1-based index of } t \\text{ in } s,\\ 0 \\text{ if absent}'], r: [] },
  stringval: { m: ['\\operatorname{StringVal}(s) = \\text{numeric value parsed from } s'], r: [] },

  // ── Combustion ──
  adiabaticflametempeq: { m: ['H_{\\text{react}}(T_r) = H_{\\text{prod}}(T_{ad}) \\quad\\text{with equilibrium dissociation at } (T_{ad}, P)'], r: [TURNS + ', Ch. 2'] },
  eq_molefraction: { m: ['\\text{species mole fraction from chemical equilibrium } \\big(\\min G \\text{ at } T, P\\big)'], r: [TURNS + ', Ch. 2'] },
  mix_mw: { m: ['\\overline{M} = \\sum_i y_i M_i'], r: [TURNS] },
  mix_cp: { m: ['c_p = \\sum_i Y_i\\,c_{p,i}(T) \\quad\\text{(mass-weighted, NASA-7)}'], r: [TURNS] },
  mix_enthalpy: { m: ['h = \\sum_i Y_i\\,h_i(T) \\quad\\text{(NASA-7 polynomials)}'], r: [TURNS] },
  mix_entropy: { m: ['s = \\sum_i Y_i\\big[s_i(T) - R_i\\ln(y_i P/P_0)\\big]'], r: [TURNS] },
  mix_viscosity: { m: ['\\mu = \\sum_i \\frac{y_i \\mu_i}{\\sum_j y_j \\phi_{ij}} \\quad\\text{(Wilke)}'], r: ['Wilke, C.R. (1950), J. Chem. Phys. 18:517'] },
  mix_conductivity: { m: ['\\lambda = \\sum_i \\frac{y_i \\lambda_i}{\\sum_j y_j \\phi_{ij}} \\quad\\text{(Wassiljewa/Wilke)}'], r: ['Mason, E.A. & Saxena, S.C. (1958), Phys. Fluids 1:361'] },
  wiebe: { m: ['x_b(\\theta) = 1 - \\exp\\!\\left[-a\\left(\\frac{\\theta-\\theta_0}{\\Delta\\theta}\\right)^{m+1}\\right]'], r: ['Heywood, J.B., *Internal Combustion Engine Fundamentals*, Ch. 9'] },

  // ── EOS remainder ──
  eos_entropy: { m: ['s(T,P) = s^{\\text{ig}}(T,P) + (s - s^{\\text{ig}})_{T,P} \\quad\\text{(ideal-gas + EOS departure)}'], r: ['Smith, J.M., Van Ness, H.C. & Abbott, M.M., *Introduction to Chemical Engineering Thermodynamics*, Ch. 6'] },
  eos_pressure: { m: ['P = \\frac{RT}{v-b} - \\frac{a\\,\\alpha(T)}{v(v+b) + b(v-b)} \\quad\\text{(PR; from } T, v)'], r: ['Peng, D.-Y. & Robinson, D.B. (1976), Ind. Eng. Chem. Fundam. 15(1):59'] },
};

// Wrapper functions (no closed form) — finalize without a fabricated math section.
const WRAPPERS = new Set([
  ...manifest.propertyFunctions.map((p) => p.name.toLowerCase()),
  ...manifest.materials.functions.map((f) => f.toLowerCase()),
  ...manifest.replCasOps.map((o) => o.toLowerCase()),
]);

// Walk baseline pages and rewrite the ones we can enrich/finalize.
let enriched = 0, finalized = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) { if (e.name !== 'components') walk(p); return; }
  if (!e.name.endsWith('.md') || e.name.startsWith('_')) return;
  let src = fs.readFileSync(p, 'utf-8');
  if (!/^generated:\s*true/m.test(src)) return; // hand-authored — leave alone
  const name = (src.match(/^name:\s*(.+)$/m) || [])[1]?.trim();
  if (!name) return;
  const key = name.toLowerCase();
  const rich = R[key];
  const wrapper = WRAPPERS.has(key);
  if (!rich && !wrapper) return; // not in scope for this pass

  // Strip frontmatter `generated: true`.
  src = src.replace(/^generated:\s*true\s*\n/m, '');
  // Replace the auto-generated note with a finalized lead (curated).
  src = src.replace(/^> \*\*Auto-generated\*\*[^\n]*\n/m,
    wrapper
      ? '> Real-fluid/material/symbolic operation — see the inputs and references below.\n'
      : '');
  // Fill references frontmatter if we have refs and it is empty.
  if (rich && rich.r.length) {
    src = src.replace(/^references:\s*\[\]\s*$/m, 'references:\n' + rich.r.map((x) => `  - "${x.replace(/\*/g, '')}"`).join('\n'));
  }

  if (rich) {
    const mathBlock = ['## Mathematical Formulation', '', '$$ ' + rich.m.join(' $$\n\n$$ ') + ' $$', ''];
    const refBlock = rich.r.length ? ['## References', '', ...rich.r.map((x, i) => `${i + 1}. ${x}.`), ''] : [];
    // Insert math after the Description section (before Input Arguments / Examples / References).
    const lines = src.split('\n');
    let insAt = lines.findIndex((l, i) => i > 0 && /^## (Input Arguments|Examples|Output Arguments|References)/.test(l));
    if (insAt === -1) insAt = lines.length;
    lines.splice(insAt, 0, ...mathBlock);
    src = lines.join('\n');
    // Append references at the end if not already present.
    if (refBlock.length && !/^## References/m.test(src)) src = src.replace(/\s*$/, '\n\n' + refBlock.join('\n'));
    enriched++;
  } else {
    finalized++;
  }
  fs.writeFileSync(p, src);
});
walk(REF);
console.log(`enrich-functions: ${enriched} functions enriched with math, ${finalized} wrappers finalized.`);
