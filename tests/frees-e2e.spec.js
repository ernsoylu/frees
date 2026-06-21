// @ts-check
/**
 * frees end-to-end Playwright tests.
 *
 * Covers: basic algebra, thermodynamic cycles (Rankine, Brayton), property
 * T-s diagrams, XY/Bode/Nyquist plots, FOR loops, unit conversions, formatted
 * reports, parametric tables, TRUE split-panel tiled layouts, diagram editor.
 *
 * All screenshots are saved to /screenshots at 1920×1080 HD resolution.
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS = path.resolve(__dirname, '../screenshots');
fs.mkdirSync(SCREENSHOTS, { recursive: true });

// ── helpers ──────────────────────────────────────────────────────────────────

/** Replace entire editor content via clipboard paste.
 *  Clipboard paste bypasses CM6's per-line auto-indent (which cascades
 *  indentation when typing \n). Paste is inserted verbatim. */
async function setCode(page, text) {
  await page.evaluate(async (code) => {
    await navigator.clipboard.writeText(code);
  }, text);
  const editor = page.locator('.cm-content').first();
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(500);
}

/** Click "Check" and wait for it to finish loading. */
async function clickCheck(page) {
  const btn = page.locator('button', { hasText: /^Check$/ }).first();
  await btn.click();
  await expect(btn).not.toHaveAttribute('data-loading', 'true', { timeout: 30_000 });
  await page.waitForTimeout(500);
}

/** Click "Solve" (main button, not the dropdown chevron) and wait. */
async function clickSolve(page) {
  const btn = page.locator('button', { hasText: /^Solve$/ }).first();
  await btn.click();
  await expect(btn).not.toHaveAttribute('data-loading', 'true', { timeout: 90_000 });
  await page.waitForTimeout(1000);
}

/** HD screenshot → screenshots/<name>.png */
async function shot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: false });
}

/** Navigate to the app and wait for the editor. */
async function openApp(page) {
  await page.goto('/');
  await page.waitForSelector('.cm-editor', { timeout: 30_000 });
  await page.waitForTimeout(800);
}

/** Switch the editor panel between 'editor' and 'formatted' views. */
async function switchEditorView(page, view) {
  const ctrl = page.locator(`[data-value="${view}"]`).first();
  if (await ctrl.count()) {
    await ctrl.click();
    await page.waitForTimeout(700);
  }
}

/**
 * Open a plot by name from the Rail "Plots windows" dropdown.
 * The InstanceLauncher button has aria-label="Plots windows".
 */
async function openPlotByName(page, plotName) {
  const railBtn = page.locator('[aria-label="Plots windows"]').first();
  await railBtn.click();
  await page.waitForTimeout(400);
  const menuItem = page.locator('[role="menuitem"]', { hasText: plotName }).first();
  if (await menuItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await menuItem.click();
    await page.waitForTimeout(2000);
    return true;
  }
  await page.keyboard.press('Escape');
  return false;
}

/**
 * Open the Plots rail dropdown and click "New X-Y plot",
 * "New property diagram", or "New psychrometric chart".
 */
async function newPlotFromRail(page, actionLabel) {
  const railBtn = page.locator('[aria-label="Plots windows"]').first();
  await railBtn.click();
  await page.waitForTimeout(400);
  const item = page.locator('[role="menuitem"]', { hasText: actionLabel }).first();
  if (await item.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await item.click();
    await page.waitForTimeout(1500);
    return true;
  }
  await page.keyboard.press('Escape');
  return false;
}

/**
 * Open the Tables rail dropdown and click a new-table action.
 */
async function newTableFromRail(page, actionLabel) {
  const railBtn = page.locator('[aria-label="Tables windows"]').first();
  await railBtn.click();
  await page.waitForTimeout(400);
  const item = page.locator('[role="menuitem"]', { hasText: actionLabel }).first();
  if (await item.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await item.click();
    await page.waitForTimeout(1500);
    return true;
  }
  await page.keyboard.press('Escape');
  return false;
}

/**
 * Open the Diagram rail dropdown and create / open the first diagram.
 */
async function openDiagramWindow(page) {
  const railBtn = page.locator('[aria-label="Diagram windows"]').first();
  await railBtn.click();
  await page.waitForTimeout(400);
  const items = page.locator('[role="menuitem"]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const txt = await items.nth(i).textContent();
    if (txt && !txt.startsWith('No ') && !txt.startsWith('New ')) {
      await items.nth(i).click();
      await page.waitForTimeout(2000);
      return true;
    }
  }
  const newBtn = page.locator('[role="menuitem"]', { hasText: 'New diagram' }).first();
  if (await newBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await newBtn.click();
    await page.waitForTimeout(2000);
    return true;
  }
  await page.keyboard.press('Escape');
  return false;
}

/**
 * Move a panel (by title) into a TRUE right-split alongside the equations editor.
 * Uses window.__freesTest.dockviewApi exposed by WorkspaceDock (available in
 * all builds). The panel must already be open (e.g. via openPlotByName).
 */
async function splitRight(page, panelTitle) {
  const moved = await page.evaluate((title) => {
    const api = window.__freesTest?.dockviewApi;
    if (!api) return false;
    const target = api.panels.find((p) => p.title === title);
    const anchor = api.getPanel('equations');
    if (!target || !anchor) return false;
    const id = target.id;
    const kind = target.params?.kind;
    const ttl = target.title;
    api.removePanel(target);
    api.addPanel({
      id,
      component: 'panel',
      title: ttl,
      params: { kind },
      position: { direction: 'right', referencePanel: 'equations' },
    });
    return true;
  }, panelTitle);
  if (moved) await page.waitForTimeout(1500);
  return !!moved;
}

/**
 * Move a panel (by title) to a below-split beneath a named reference panel.
 */
async function splitBelow(page, panelTitle, referenceTitle) {
  const moved = await page.evaluate(([title, refTitle]) => {
    const api = window.__freesTest?.dockviewApi;
    if (!api) return false;
    const target = api.panels.find((p) => p.title === title);
    const ref = api.panels.find((p) => p.title === refTitle);
    if (!target || !ref) return false;
    const id = target.id;
    const kind = target.params?.kind;
    const ttl = target.title;
    const refId = ref.id;
    api.removePanel(target);
    api.addPanel({
      id,
      component: 'panel',
      title: ttl,
      params: { kind },
      position: { direction: 'below', referencePanel: refId },
    });
    return true;
  }, [panelTitle, referenceTitle]);
  if (moved) await page.waitForTimeout(1500);
  return !!moved;
}

/**
 * Close the Solution panel (right edge group) to get a clean view.
 */
async function closeSolutionPanel(page) {
  const closeBtn = page
    .locator('[data-testid="dockview-dv-default-tab"]')
    .filter({ hasText: /^Solution$/ })
    .locator('[aria-label="Close"]')
    .first();
  if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeBtn.click();
    await page.waitForTimeout(400);
  }
}

// ── tests ────────────────────────────────────────────────────────────────────

test.describe('frees — engineering problem-solving scenarios', () => {

  // ── 01: Basic algebra ──────────────────────────────────────────────────────
  test('01 · Basic algebraic system', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Simple 2-variable system }
x + y = 10
x * y = 24`);
    await shot(page, '01a-editor-entered');
    await clickCheck(page);
    await shot(page, '01b-after-check');
    await clickSolve(page);
    await shot(page, '01c-after-solve');
    await expect(page.locator('text=x').first()).toBeVisible({ timeout: 10_000 });
    await shot(page, '01d-solution-tiled');
  });

  // ── 02: Ideal Rankine steam power cycle ───────────────────────────────────
  test('02 · Ideal Rankine steam power cycle', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Ideal Rankine Steam Power Cycle }
P_high = 8000 [kPa]
P_low = 10 [kPa]
T_boiler = 500 [C]
eta_turb = 0.85
eta_pump = 0.90
W_dot_net = 10000 [kW]

h1 = Enthalpy(Water, P=P_high, T=T_boiler)
s1 = Entropy(Water, P=P_high, T=T_boiler)
s_2s = s1
h_2s = Enthalpy(Water, P=P_low, s=s_2s)
h2 = h1 - eta_turb * (h1 - h_2s)
h3 = Enthalpy(Water, P=P_low, x=0)
v3 = Volume(Water, P=P_low, x=0)
h_4s = Enthalpy(Water, P=P_high, s=Entropy(Water, P=P_low, x=0))
h4 = h3 + (h_4s - h3) / eta_pump

w_turb = h1 - h2
w_pump = h4 - h3
q_boiler = h1 - h4
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net`);
    await shot(page, '02a-rankine-code');
    await clickSolve(page);
    await shot(page, '02b-rankine-solved');
    await expect(page.locator('text=eta_th').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '02c-rankine-solution-tiled');
  });

  // ── 03: Reheat Rankine with T-s property diagram ──────────────────────────
  test('03 · Reheat Rankine + T-s property diagram', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Reheat Rankine Cycle with Moisture Limit }
m_dot = 7.7 [kg/s]
P[3] = 12500 [kPa]
T[3] = 550 [C]
P[4] = 2000 [kPa]
T[5] = 450 [C]
P[5] = P[4]
eta_turb = 0.85
eta_pump = 0.90
x[6] = 0.95

h[3] = Enthalpy(Water, P=P[3], T=T[3])
s[3] = Entropy(Water, P=P[3], T=T[3])
h_4s = Enthalpy(Water, P=P[4], s=s[3])
h[4] = h[3] - eta_turb * (h[3] - h_4s)
h[5] = Enthalpy(Water, P=P[5], T=T[5])
s[5] = Entropy(Water, P=P[5], T=T[5])
h_6s = Enthalpy(Water, P=P[6], s=s[5])
h[6] = h[5] - eta_turb * (h[5] - h_6s)
h[6] = Enthalpy(Water, P=P[6], x=x[6])
P[1] = P[6]
h[1] = Enthalpy(Water, P=P[6], x=0)
v[1] = Volume(Water, P=P[6], x=0)
P[2] = P[3]
w_pump = v[1] * (P[3] - P[6]) / eta_pump
h[2] = h[1] + w_pump
q_in = (h[3] - h[2]) + (h[5] - h[4])
w_turb = (h[3] - h[4]) + (h[5] - h[6])
w_net = w_turb - w_pump
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100

PLOT 'Reheat Rankine T-s'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

[Graph="Reheat Rankine T-s"] T-s diagram of the reheat Rankine cycle [/Graph]`);
    await shot(page, '03a-reheat-rankine-code');
    await clickSolve(page);
    await shot(page, '03b-reheat-rankine-solved');

    // Open the T-s property diagram from the Plots rail
    await openPlotByName(page, 'Reheat Rankine T-s');
    await shot(page, '03c-ts-diagram-tiled');

    // Switch to formatted view to see embedded plot in report
    await switchEditorView(page, 'formatted');
    await page.waitForTimeout(2500);
    await shot(page, '03d-formatted-report-with-ts-diagram');
    await switchEditorView(page, 'editor');
  });

  // ── 04: Brayton regenerative cycle + Air T-s diagram ──────────────────────
  test('04 · Brayton regenerative cycle + Air T-s diagram', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Brayton Cycle with Regeneration, Variable Specific Heats }
P[1] = 100 [kPa]
T[1] = 310 [K]
r_p = 7
P[2] = P[1] * r_p
T[3] = 1150 [K]
eta_C = 0.75
eta_T = 0.82
epsilon = 0.65

h[1] = Enthalpy(Air, T=T[1], P=P[1])
s[1] = Entropy(Air, T=T[1], P=P[1])
h_2s = Enthalpy(Air, P=P[2], s=s[1])
w_C = (h_2s - h[1]) / eta_C
h[2] = h[1] + w_C
T[2] = Temperature(Air, P=P[2], h=h[2])
h[3] = Enthalpy(Air, T=T[3], P=P[2])
s[3] = Entropy(Air, T=T[3], P=P[2])
h_4s = Enthalpy(Air, P=P[1], s=s[3])
w_T = eta_T * (h[3] - h_4s)
h[4] = h[3] - w_T
P[4] = P[1]
T[4] = Temperature(Air, P=P[1], h=h[4])
P[5] = P[2]
h[5] = h[2] + epsilon * (h[4] - h[2])
q_in = h[3] - h[5]
w_net = w_T - w_C
eta_th = w_net / q_in * 100

PLOT 'Brayton T-s'
  kind = property
  fluid = Air
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END`);
    await clickSolve(page);
    await shot(page, '04a-brayton-regen-solved');

    await openPlotByName(page, 'Brayton T-s');
    await shot(page, '04b-brayton-ts-tiled-with-solution');
  });

  // ── 05: Second-order step response + XY plot ──────────────────────────────
  test('05 · Control: step response + XY plot (tiled)', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Second-order step response and performance metrics }
num = [0, 0, 100]
den = [1, 15, 100]
wn = sqrt(100)
zeta = 15 / (2*wn)
Tp = pi# / (wn*sqrt(1 - zeta^2))
OS = 100 * exp(-zeta*pi#/sqrt(1 - zeta^2))
Ts = 4 / (zeta*wn)
t = 0:0.02:1
N = 51
CALL step(num[1:3], den[1:3], t[1:N] : y[1:N])

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = Time [s]
  ylabel = Amplitude
END`);
    await clickSolve(page);
    await shot(page, '05a-step-response-solved');

    await openPlotByName(page, 'Step Response');
    await shot(page, '05b-step-response-xy-tiled');
  });

  // ── 06: Bode diagram + Nyquist stability ──────────────────────────────────
  test('06 · Control: Bode + Nyquist diagrams (tiled)', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Bode and Nyquist stability analysis }
num = [0, 0, 0, 50]
den = [1, 9, 18, 0]
Nw = 50
omega = 0.1:50:100 | Log
CALL bode(num[1:4], den[1:4], omega[1:Nw] : mag[1:Nw], phase[1:Nw])
CALL margin(num[1:4], den[1:4] : gm, pm, w_cg, w_cp)
CALL nyquist(num[1:4], den[1:4], omega[1:Nw] : re[1:Nw], im[1:Nw])

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END`);
    await clickSolve(page);
    await shot(page, '06a-bode-nyquist-solved');

    await openPlotByName(page, 'Bode Diagram');
    await shot(page, '06b-bode-tiled');

    await openPlotByName(page, 'Nyquist Diagram');
    await shot(page, '06c-nyquist-tiled');
  });

  // ── 07: Parallel pipe network (FOR loop, Colebrook) ───────────────────────
  test('07 · Fluid mechanics: parallel pipe network', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Civil/Fluids: parallel pipe network, Colebrook friction }
rho = 1000 [kg/m^3]
mu = 0.001 [Pa-s]
g = 9.81 [m/s^2]
Q_in = 0.10 [m^3/s]
L[1]=300; L[2]=500; L[3]=400
D[1]=0.25; D[2]=0.15; D[3]=0.20
eps = 0.00015
Q_in = Q[1]
Q[1] = Q[2] + Q[3]
hf[2] = hf[3]
FOR j = 1 TO 3
  V[j] = Q[j]/(pi#/4*D[j]^2)
  Re[j] = rho*V[j]*D[j]/mu
  1/sqrt(ff[j]) = -2*log10(eps/(3.7*D[j]) + 2.51/(Re[j]*sqrt(ff[j])))
  hf[j] = ff[j]*L[j]/D[j]*V[j]^2/(2*g)
END
h_total = hf[1] + hf[2]`);
    await clickSolve(page);
    await shot(page, '07a-pipe-network-solved');
    await expect(page.locator('text=h_total').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '07b-pipe-network-solution-tiled');
  });

  // ── 08: EV road load with unit conversions ────────────────────────────────
  test('08 · EV road load — unit conversions & range', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ EV longitudinal road-load: force, power, consumption and range }
M = 1500 [kg]
g = 9.81 [m/s^2]
Crr = 0.012
rho = 1.2 [kg/m^3]
Cd = 0.30
A_f = 2.2 [m^2]
alpha = 0 [deg]
V = 120 [km/h]
eta_t = 0.90
eta_m = 0.95
E_pack = 60 [kWh]

F_roll  = M*g*Crr*cos(alpha)
F_grade = M*g*sin(alpha)
F_aero  = 0.5*rho*Cd*A_f*V^2
F_trac  = F_roll + F_grade + F_aero
P_wheel = F_trac*V
P_batt  = P_wheel/(eta_t*eta_m)
cons    = P_batt/V
Range   = E_pack/cons`);
    await clickSolve(page);
    await shot(page, '08a-ev-road-load-solved');
    await expect(page.locator('text=Range').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '08b-ev-road-load-tiled');
  });

  // ── 09: Combined Brayton–Rankine cycle (HRSG) ────────────────────────────
  test('09 · Combined Brayton-Rankine cycle (HRSG)', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Combined cycle: Brayton gas turbine + Rankine steam bottoming }
{ Brayton top cycle (Air, real-gas) }
P_1 = 100 [kPa]; T_1 = 300 [K]; r_p = 12; T_3 = 1400 [K]
eta_C = 0.86; eta_T = 0.90
P_2 = P_1*r_p; P_3 = P_2; P_4 = P_1
h_1 = Enthalpy(Air, T=T_1, P=P_1)
s_1 = Entropy(Air, T=T_1, P=P_1)
h_2s = Enthalpy(Air, P=P_2, s=s_1)
w_C = (h_2s - h_1)/eta_C; h_2 = h_1 + w_C
h_3 = Enthalpy(Air, T=T_3, P=P_3)
s_3 = Entropy(Air, T=T_3, P=P_3)
h_4s = Enthalpy(Air, P=P_4, s=s_3)
w_T = eta_T*(h_3-h_4s); h_4 = h_3 - w_T
T_4 = Temperature(Air, P=P_4, h=h_4)
w_net_B = w_T - w_C
q_in_B = h_3 - h_2
eta_B = w_net_B/q_in_B*100
{ Rankine bottom cycle (Water) }
T_pinch = 15
T_5 = T_4 - T_pinch; P_5 = 2000 [kPa]
h_5 = Enthalpy(Water, T=T_5, x=1)
s_5 = Entropy(Water, T=T_5, x=1)
P_6 = 10 [kPa]
h_6s = Enthalpy(Water, P=P_6, s=s_5)
h_6 = h_5 - eta_T*(h_5-h_6s)
h_7 = Enthalpy(Water, P=P_6, x=0)
v_7 = Volume(Water, P=P_6, x=0)
h_8 = h_7 + v_7*(P_5-P_6)/eta_C
q_in_R = h_5 - h_8
w_net_R = (h_5-h_6) - (h_8-h_7)
eta_R = w_net_R/q_in_R*100
{ Combined plant }
ratio = q_in_R/q_in_B
eta_comb = (w_net_B + ratio*w_net_R)/q_in_B*100`);
    await clickSolve(page);
    await shot(page, '09a-combined-cycle-solved');
    await expect(page.locator('text=eta_comb').first()).toBeVisible({ timeout: 20_000 });
    await shot(page, '09b-combined-cycle-tiled');
  });

  // ── 10: Partial fractions (SYMBOLIC) ─────────────────────────────────────
  test('10 · Symbolic: partial fraction decomposition', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Partial fractions — Laplace domain: X(s) = (3s+7)/((s+1)(s+2)) }
SYMBOLIC
X(s) = (3*s + 7) / ((s+1) * (s+2))`);
    await clickSolve(page);
    await shot(page, '10a-symbolic-partial-fractions-solved');
    await shot(page, '10b-symbolic-solution-tiled');
  });

  // ── 11: Radiation enclosure ───────────────────────────────────────────────
  test('11 · Heat transfer: 3-surface radiation enclosure', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Radiation enclosure — 3-surface square room }
T[1] = 1200 [K]; eps[1] = 0.85
T[2] = 400 [K];  eps[2] = 0.60
T[3] = 500 [K];  eps[3] = 0.00
sigma = 5.67e-8 [W/m^2-K^4]
A[1] = 1; A[2] = 1; A[3] = 4
F[1,2] = 0.20; F[2,1] = 0.20
F[1,1] = 0; F[2,2] = 0; F[3,3] = 0
F[1,3] = 1 - F[1,1] - F[1,2]
F[2,3] = 1 - F[2,1] - F[2,2]
F[3,1] = A[1]*F[1,3]/A[3]
F[3,2] = A[2]*F[2,3]/A[3]
Eb[1] = sigma*T[1]^4; Eb[2] = sigma*T[2]^4; Eb[3] = sigma*T[3]^4
FOR i = 1 TO 3
  J[i] = eps[i]*Eb[i] + (1-eps[i])*(A[1]*F[1,i]*J[1] + A[2]*F[2,i]*J[2] + A[3]*F[3,i]*J[3])/A[i]
END
FOR i = 1 TO 3
  q[i] = A[i]*eps[i]/(1-eps[i]+1e-12) * (Eb[i] - J[i])
END
q_net = q[1] + q[2] + q[3]`);
    await clickSolve(page);
    await shot(page, '11a-radiation-solved');
    await expect(page.locator('text=q_net').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '11b-radiation-tiled');
  });

  // ── 12: LQR optimal regulator ─────────────────────────────────────────────
  test('12 · Control: LQR optimal regulator design', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ LQR optimal regulator — double integrator }
A[1:2,1:2] = [0, 1; 0, 0]
B[1:2,1:1] = [0; 1]
Q_lqr[1:2,1:2] = [1, 0; 0, 1]
R_lqr = 0.01
CALL lqr(A[1:2,1:2], B[1:2,1:1], Q_lqr[1:2,1:2], R_lqr : K_lqr[1:1,1:2], P_lqr[1:2,1:2])`);
    await clickSolve(page);
    await shot(page, '12a-lqr-solved');
    await expect(page.locator('text=K_lqr').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '12b-lqr-tiled');
  });

  // ── 13: Formatted report with embedded Bode + Step plots ──────────────────
  test('13 · Formatted report with embedded Bode and step-response plots', async ({ page }) => {
    await openApp(page);
    await setCode(page, `# Control System Analysis Report

This report analyzes the plant G(s) end to end.

## 1. Plant model

num = [0, 0, 1, 3]
den = [1, 4, 29, 50]

## 2. Poles and stability margins

CALL pole(num[1:4], den[1:4] : pr[1:3], pi[1:3])
CALL zero(num[1:4], den[1:4] : zr[1:1], zi[1:1])
CALL margin(num[1:4], den[1:4] : gm, pm, w_cg, w_cp)

## 3. Frequency response

Nw = 50
omega = 0.1:50:100 | Log
CALL bode(num[1:4], den[1:4], omega[1:Nw] : mag[1:Nw], phase[1:Nw])

[Graph="Bode Diagram"] Bode magnitude and phase [/Graph]

## 4. Step response

Nt = 121
t = 0:0.05:6
CALL step(num[1:4], den[1:4], t[1:Nt] : y[1:Nt])

[Graph="Step Response"] Unit step response [/Graph]

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = Time [s]
  ylabel = Amplitude
END`);
    await clickSolve(page);
    await shot(page, '13a-report-code-tiled');

    await switchEditorView(page, 'formatted');
    await page.waitForTimeout(3000);
    await shot(page, '13b-formatted-report-tiled');
  });

  // ── 14: TRUE TILED — equations (left) | Rankine T-s diagram (right) ───────
  test('14 · TILED: equations left | Rankine T-s property diagram right', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Rankine cycle — tiled view demo }
P_high = 8000 [kPa]
P_low = 10 [kPa]
T_boiler = 500 [C]
eta_turb = 0.85
eta_pump = 0.90
W_dot_net = 10000 [kW]

h1 = Enthalpy(Water, P=P_high, T=T_boiler)
s1 = Entropy(Water, P=P_high, T=T_boiler)
s_2s = s1
h_2s = Enthalpy(Water, P=P_low, s=s_2s)
h2 = h1 - eta_turb * (h1 - h_2s)
h3 = Enthalpy(Water, P=P_low, x=0)
v3 = Volume(Water, P=P_low, x=0)
h_4s = Enthalpy(Water, P=P_high, s=Entropy(Water, P=P_low, x=0))
h4 = h3 + (h_4s - h3) / eta_pump
w_turb = h1 - h2
w_pump = h4 - h3
q_boiler = h1 - h4
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net

PLOT 'Rankine T-s'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END`);
    await clickSolve(page);
    await shot(page, '14a-rankine-solved');

    // Open the T-s property plot (lands as a tab in center group)
    await openPlotByName(page, 'Rankine T-s');
    // TRUE split: move it to a right-split alongside the equations editor
    await splitRight(page, 'Rankine T-s');
    // Close solution panel for a clean 2-column view
    await closeSolutionPanel(page);
    await page.waitForTimeout(2000);
    // Result: equations editor (left ~55%) | T-s water diagram (right ~45%)
    await shot(page, '14b-tiled-equations-left-ts-right');
  });

  // ── 15: Fatigue life via Paris law integral ───────────────────────────────
  test('15 · Materials: fatigue life via Paris law integral', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Materials: fatigue life — Paris law integral from a_i to a_c }
C = 6.9e-12; m = 3.0
Y = 1.12
K_IC = 60
sig_max = 300
dsig = 200
a_i = 0.0005
a_c = (K_IC/(sig_max*Y))^2/pi#
N_f = Integral(1/(C*(dsig*Y*sqrt(pi#*a))^m), a, a_i, a_c)`);
    await clickSolve(page);
    await shot(page, '15a-paris-law-solved');
    await expect(page.locator('text=N_f').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '15b-paris-law-tiled');
  });

  // ── 16: TRUE TILED — equations (left) | parametric table (right) ──────────
  test('16 · TILED: equations left | parametric table right (EV sweep)', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ EV road-load — parametric speed sweep }
M = 1500 [kg]
g = 9.81 [m/s^2]
Crr = 0.012
rho = 1.2 [kg/m^3]
Cd = 0.30
A_f = 2.2 [m^2]
alpha = 0 [deg]
V = 100 [km/h]
eta_t = 0.90
eta_m = 0.95
E_pack = 60 [kWh]

F_roll  = M*g*Crr*cos(alpha)
F_aero  = 0.5*rho*Cd*A_f*V^2
F_trac  = F_roll + F_aero
P_wheel = F_trac*V
P_batt  = P_wheel/(eta_t*eta_m)
cons    = P_batt/V
Range   = E_pack/cons`);
    await clickSolve(page);
    await shot(page, '16a-ev-baseline-solved');

    // Create a parametric table from the Tables rail (opens as a center tab)
    await newTableFromRail(page, 'New parametric table');
    await page.waitForTimeout(1500);

    // Find the table panel title via the dockview API
    const tableTitle = await page.evaluate(() => {
      const api = window.__freesTest?.dockviewApi;
      if (!api) return null;
      const t = api.panels.find((p) => p.params?.kind === 'table');
      return t ? t.title : null;
    });

    if (tableTitle) {
      // TRUE split: move table to the right of the equations editor
      await splitRight(page, tableTitle);
    }
    await closeSolutionPanel(page);
    await page.waitForTimeout(1000);
    // Result: equations editor (left) | parametric table (right)
    await shot(page, '16b-tiled-equations-left-table-right');
  });

  // ── 17: Plane truss by direct stiffness (SolveLinear + FOR) ──────────────
  test('17 · Structural: plane truss direct stiffness method', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Structural: 3-bar plane truss — direct stiffness method }
E = 210e9 [Pa]
A = 1e-3 [m^2]
P = 100e3 [N]
L[1]=3; L[2]=5; L[3]=5
cx[1]=0;    sy[1]=1
cx[2]=0.8;  sy[2]=0.6
cx[3]=-0.8; sy[3]=0.6
FOR m = 1 TO 3
  ka[m] = E*A/L[m]
END
Kg[1,1] = ka[1]*cx[1]^2 + ka[2]*cx[2]^2 + ka[3]*cx[3]^2
Kg[1,2] = ka[1]*cx[1]*sy[1] + ka[2]*cx[2]*sy[2] + ka[3]*cx[3]*sy[3]
Kg[2,1] = Kg[1,2]
Kg[2,2] = ka[1]*sy[1]^2 + ka[2]*sy[2]^2 + ka[3]*sy[3]^2
F[1:2] = [0, -P]
u[1:2] = SolveLinear(Kg[1:2,1:2], F[1:2])
FOR m = 1 TO 3
  Naxial[m] = ka[m]*(cx[m]*u[1] + sy[m]*u[2])
END`);
    await clickSolve(page);
    await shot(page, '17a-truss-solved');
    await expect(page.locator('text=Naxial').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '17b-truss-tiled');
  });

  // ── 18: TRUE TILED — 3-panel: equations | Bode (right) | Step (below Bode) ─
  test('18 · TILED: 3-panel — equations | Bode right | Step below Bode', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Control analysis — four plot types for tiled-view demo }
num = [0, 0, 1, 3]
den = [1, 4, 29, 50]
CALL pole(num[1:4], den[1:4] : pr[1:3], pi[1:3])
CALL zero(num[1:4], den[1:4] : zr[1:1], zi[1:1])
CALL margin(num[1:4], den[1:4] : gm, pm, w_cg, w_cp)
Nw = 50
omega = 0.1:50:100 | Log
CALL bode(num[1:4], den[1:4], omega[1:Nw] : mag[1:Nw], phase[1:Nw])
CALL nyquist(num[1:4], den[1:4], omega[1:Nw] : re[1:Nw], im[1:Nw])
Nt = 81
t = 0:0.05:4
CALL step(num[1:4], den[1:4], t[1:Nt] : y[1:Nt])

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = Time [s]
  ylabel = Amplitude
END

PLOT 'Pole-Zero Map'
  kind = polezero
  pr = pr
  pi = pi
  zr = zr
  zi = zi
END`);
    await clickSolve(page);
    await shot(page, '18a-multi-plot-solved');

    // Open all four plots (each lands as a tab in the center group)
    await openPlotByName(page, 'Bode Diagram');
    await openPlotByName(page, 'Step Response');
    await openPlotByName(page, 'Nyquist Diagram');
    await openPlotByName(page, 'Pole-Zero Map');

    // TRUE split: move Bode to the RIGHT of the equations editor
    await splitRight(page, 'Bode Diagram');
    await shot(page, '18b-tiled-equations-left-bode-right');

    // TRUE split: move Step Response BELOW Bode
    await splitBelow(page, 'Step Response', 'Bode Diagram');
    await closeSolutionPanel(page);
    await page.waitForTimeout(2000);
    // Result: equations (left) | Bode (right-top) | Step Response (right-bottom)
    await shot(page, '18c-tiled-3panel-equations-bode-step');

    // Also screenshot with Nyquist tab selected in center group
    const nyquistTab = page.locator('[data-testid="dockview-dv-default-tab"]', { hasText: 'Nyquist Diagram' }).first();
    if (await nyquistTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nyquistTab.click();
      await page.waitForTimeout(1500);
    }
    await shot(page, '18d-nyquist-center-tabs-visible');
  });

  // ── 19: Kepler equation (orbital mechanics) ───────────────────────────────
  test('19 · Aerospace: orbital position via Kepler equation', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Aerospace: elliptical Earth orbit — position via Kepler's equation }
mu = 398600 [km^3/s^2]
Re = 6378 [km]
alt_p = 300 [km]; alt_a = 3000 [km]
rp = Re + alt_p
ra = Re + alt_a
a = (rp + ra)/2
ecc = (ra - rp)/(ra + rp)
Tper = 2*pi#*sqrt(a^3/mu)
tk = Tper/4
M = 2*pi#*tk/Tper
M = EA - ecc*sin(EA)
nu = 2*arctan( sqrt((1+ecc)/(1-ecc)) * tan(EA/2) )
nu_deg = nu*180/pi#
r = a*(1 - ecc*cos(EA))
v = sqrt(mu*(2/r - 1/a))`);
    await clickSolve(page);
    await shot(page, '19a-kepler-solved');
    await shot(page, '19b-kepler-tiled');
  });

  // ── 20: CD nozzle + normal shock ─────────────────────────────────────────
  test('20 · Aerospace: CD nozzle with normal shock at exit', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Aerospace: CD nozzle, supersonic branch + normal shock at exit }
g = 1.4
R = 287 [J/kg-K]
P0 = 1000 [kPa]
T0 = 600 [K]
A_ratio = 4.0
A_ratio = (1/Me)*((2/(g+1))*(1+(g-1)/2*Me^2))^((g+1)/(2*(g-1)))
Pe = P0*(1+(g-1)/2*Me^2)^(-g/(g-1))
Te = T0*(1+(g-1)/2*Me^2)^(-1)
Ve = Me*sqrt(g*R*Te)
M2 = sqrt((1+(g-1)/2*Me^2)/(g*Me^2-(g-1)/2))
P2 = Pe*(1+g*Me^2)/(1+g*M2^2)
T2 = Te*(1+(g-1)/2*Me^2)/(1+(g-1)/2*M2^2)
P02 = P2*(1+(g-1)/2*M2^2)^(g/(g-1))`);
    await clickSolve(page);
    await shot(page, '20a-nozzle-shock-solved');
    await shot(page, '20b-nozzle-shock-tiled');
  });

  // ── 21: TRUE TILED — formatted report (left) | Brayton T-s diagram (right) ─
  test('21 · TILED: formatted report left | Brayton T-s property diagram right', async ({ page }) => {
    await openApp(page);
    await setCode(page, `# Brayton Cycle Analysis

## System Overview

Regenerative Brayton cycle using real-gas air properties from CoolProp.
Compressor efficiency 75%, turbine efficiency 82%, regenerator effectiveness 65%.

P[1] = 100 [kPa]
T[1] = 310 [K]
r_p = 7
P[2] = P[1] * r_p
T[3] = 1150 [K]
eta_C = 0.75
eta_T = 0.82
epsilon = 0.65

h[1] = Enthalpy(Air, T=T[1], P=P[1])
s[1] = Entropy(Air, T=T[1], P=P[1])
h_2s = Enthalpy(Air, P=P[2], s=s[1])
w_C = (h_2s - h[1]) / eta_C
h[2] = h[1] + w_C
T[2] = Temperature(Air, P=P[2], h=h[2])
h[3] = Enthalpy(Air, T=T[3], P=P[2])
s[3] = Entropy(Air, T=T[3], P=P[2])
h_4s = Enthalpy(Air, P=P[1], s=s[3])
w_T = eta_T * (h[3] - h_4s)
h[4] = h[3] - w_T
P[4] = P[1]
T[4] = Temperature(Air, P=P[1], h=h[4])
P[5] = P[2]
h[5] = h[2] + epsilon * (h[4] - h[2])
q_in = h[3] - h[5]
w_net = w_T - w_C
eta_th = w_net / q_in * 100

## Results

The T-s diagram overlays the cycle states on the air property diagram.

[Graph="Brayton T-s"] T-s diagram — regenerative Brayton cycle on air [/Graph]

PLOT 'Brayton T-s'
  kind = property
  fluid = Air
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END`);
    await clickSolve(page);

    // Open Brayton T-s plot (lands as a center tab)
    await openPlotByName(page, 'Brayton T-s');
    // TRUE split: move to the right of the equations editor
    await splitRight(page, 'Brayton T-s');
    await closeSolutionPanel(page);
    await page.waitForTimeout(1500);
    await shot(page, '21a-tiled-editor-left-brayton-ts-right');

    // Switch the left panel to formatted view → report with embedded T-s + diagram on right
    await switchEditorView(page, 'formatted');
    await page.waitForTimeout(3000);
    // Result: formatted markdown report (left) | T-s property diagram (right)
    await shot(page, '21b-tiled-formatted-report-left-ts-right');

    await switchEditorView(page, 'editor');
    await shot(page, '21c-tiled-editor-restored');
  });

  // ── 22: TRUE TILED — equations (left) | diagram editor (right) ────────────
  test('22 · TILED: equations left | diagram editor right', async ({ page }) => {
    await openApp(page);
    // Load a simple solved system so variables are available for diagram bindings
    await setCode(page, `{ Thermal system — variables for diagram annotation }
T_hot = 350 [K]
T_cold = 280 [K]
Q_dot = 5000 [W]
COP = T_cold / (T_hot - T_cold)
W_dot = Q_dot / COP`);
    await clickSolve(page);
    await shot(page, '22a-equations-solved');

    // Open the diagram editor from the Diagram rail
    await openDiagramWindow(page);

    // Find the diagram panel's title from the dockview API
    const diagramTitle = await page.evaluate(() => {
      const api = window.__freesTest?.dockviewApi;
      if (!api) return null;
      const d = api.panels.find((p) => p.params?.kind === 'diagram');
      return d ? d.title : null;
    });

    if (diagramTitle) {
      // TRUE split: move diagram to the right of the equations editor
      await splitRight(page, diagramTitle);
    }
    await closeSolutionPanel(page);
    await page.waitForTimeout(1500);
    // Result: equations editor (left) | diagram canvas (right)
    await shot(page, '22b-tiled-equations-left-diagram-right');
  });

  // ── 23: Ammonia refrigeration cycle (English units) ───────────────────────
  test('23 · HVAC: ammonia refrigeration COP', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Ammonia Refrigeration Cycle COP (NCEES Problem 1) }
P_suction = 38.5 [psia]
P_discharge = 229 [psia]
m_dot = 22 [lb/min]

h1 = 627.0 [Btu/lbm]
h2 = 745.0 [Btu/lbm]
h3 = 161.1 [Btu/lbm]

COP = (h1 - h3) / (h2 - h1)
Q_dot_cool = m_dot * (h1 - h3)
W_dot_comp = m_dot * (h2 - h1)`);
    await clickSolve(page);
    await shot(page, '23a-ammonia-refrigeration-solved');
    await expect(page.locator('text=COP').first()).toBeVisible({ timeout: 10_000 });
    await shot(page, '23b-ammonia-refrigeration-tiled');
  });

  // ── 24: Steam-methane reforming equilibrium ───────────────────────────────
  test('24 · Chemical: coupled SMR + WGS equilibrium', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Chemical: coupled equilibrium — steam-methane reforming + WGS }
Kp1 = 26.0
Kp2 = 1.45
P = 1.0 [bar]
P0 = 1.0 [bar]
n_CH4_0 = 1; n_H2O_0 = 3
n_CH4 = n_CH4_0 - x1
n_H2O = n_H2O_0 - x1 - x2
n_CO  = x1 - x2
n_H2  = 3*x1 + x2
n_CO2 = x2
n_tot = n_CH4 + n_H2O + n_CO + n_H2 + n_CO2
y_CH4 = n_CH4/n_tot; y_H2O = n_H2O/n_tot; y_CO = n_CO/n_tot
y_H2 = n_H2/n_tot;   y_CO2 = n_CO2/n_tot
Kp1 = (y_CO*y_H2^3)/(y_CH4*y_H2O) * (P/P0)^2
Kp2 = (y_CO2*y_H2)/(y_CO*y_H2O)
conv = x1/n_CH4_0*100`);
    await clickSolve(page);
    await shot(page, '24a-smr-equilibrium-solved');
    await expect(page.locator('text=conv').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '24b-smr-equilibrium-tiled');
  });

  // ── 25: Nuclear reactor period (inhour equation) ──────────────────────────
  test('25 · Nuclear: stable reactor period (inhour equation)', async ({ page }) => {
    await openApp(page);
    await setCode(page, `{ Nuclear: stable reactor period — 6-group inhour equation (U-235) }
Lambda = 2e-5 [s]
rho = 0.0025
beta[1:6] = [0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273]
lam[1:6]  = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01]
FOR i = 1 TO 6
  term[i] = beta[i]/(1 + lam[i]*Tper)
END
rho = Lambda/Tper + sum(term[1:6])
beta_tot = sum(beta[1:6])`);
    await clickSolve(page);
    await shot(page, '25a-inhour-solved');
    await expect(page.locator('text=Tper').first()).toBeVisible({ timeout: 15_000 });
    await shot(page, '25b-inhour-tiled');
  });

});
