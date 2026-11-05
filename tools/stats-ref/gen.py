#!/usr/bin/env python3
"""Dump NumPy/SciPy/statsmodels/SALib ground truth for the statistics stack.

Why this exists
---------------
The Phase 4 statistics, fitting, signal, sampling and sensitivity code was
checked by hand-worked unit tests and by documentation examples. Neither
establishes parity with the libraries an engineer would cross-check against,
and CI has no Python. So the truth is recorded here once and
`crates/frees-core/tests/reference_libraries.rs` grades frees against it.

Every case is graded on *the same inputs*: the sensitivity groups rebuild the
exact design frees evaluates (its unscrambled Sobol' points XOR its JavaRandom
digital shift, its JavaRandom Morris trajectories), so SALib grades frees'
estimators rather than two different random designs.

Generated artefact: version stamped, regenerated deliberately, never on build.

    python3 -m venv /tmp/refenv && /tmp/refenv/bin/pip install numpy scipy statsmodels SALib
    /tmp/refenv/bin/python tools/stats-ref/gen.py > fixtures/stats/reference.json
"""
import json, math, sys

import numpy as np
from importlib.metadata import version
import scipy
import statsmodels
import statsmodels.api as sm
from SALib.analyze import morris as salib_morris
from SALib.analyze import sobol as salib_sobol
from scipy import optimize, signal, special, stats
from scipy.stats import qmc

SEED = 20261031
rng = np.random.default_rng(SEED)


def sample(n, loc=0.0, scale=1.0, digits=4):
    """Rounded so the literal written into a document is the exact double."""
    return [round(float(v), digits) for v in rng.normal(loc, scale, n)]


def args(xs):
    return ", ".join(repr(x) for x in xs)


def lit(xs):
    """The list-literal form the vector-argument intrinsics take."""
    return "[" + args(xs) + "]"


# ── Scalar intrinsics, replayed through a solved document ───────────────────

x = sample(25, 10.0, 2.0)
y = [round(1.5 * a - 3.0 + e, 4) for a, e in zip(x, sample(25, 0.0, 0.8))]
before = sample(12, 140.0, 8.0)
after = [round(b - 4.0 + e, 4) for b, e in zip(before, sample(12, 0.0, 3.0))]
g1, g2, g3 = sample(8, 5.0, 1.0), sample(11, 5.6, 1.2), sample(9, 4.7, 0.9)
w = [round(float(v), 3) for v in rng.uniform(0.5, 3.0, 25)]
observed = [18, 25, 21, 16, 20]
expected = [20, 20, 20, 20, 20]

t1 = stats.ttest_1samp(x, 9.0)
tp = stats.ttest_rel(before, after)
tw = stats.ttest_ind(g1, g2, equal_var=False)
an = stats.f_oneway(g1, g2, g3)
cg = stats.chisquare(observed, expected)
lr = stats.linregress(x, y)
ci = sm.stats.DescrStatsW(np.array(x)).tconfint_mean(alpha=0.05)

scalar = [
    # distributions and special functions
    ("tcdf(1.3, 7)", "scipy.stats.t.cdf(1.3, 7)", stats.t.cdf(1.3, 7)),
    ("tcdf(-2.7, 3.5)", "scipy.stats.t.cdf(-2.7, 3.5)", stats.t.cdf(-2.7, 3.5)),
    ("tpdf(0.8, 12)", "scipy.stats.t.pdf(0.8, 12)", stats.t.pdf(0.8, 12)),
    ("tinv(0.975, 9)", "scipy.stats.t.ppf(0.975, 9)", stats.t.ppf(0.975, 9)),
    ("tinv(0.001, 4)", "scipy.stats.t.ppf(0.001, 4)", stats.t.ppf(0.001, 4)),
    ("fcdf(2.5, 4, 10)", "scipy.stats.f.cdf(2.5, 4, 10)", stats.f.cdf(2.5, 4, 10)),
    ("fpdf(1.2, 3, 17)", "scipy.stats.f.pdf(1.2, 3, 17)", stats.f.pdf(1.2, 3, 17)),
    ("finv(0.95, 4, 10)", "scipy.stats.f.ppf(0.95, 4, 10)", stats.f.ppf(0.95, 4, 10)),
    ("finv(0.01, 6, 30)", "scipy.stats.f.ppf(0.01, 6, 30)", stats.f.ppf(0.01, 6, 30)),
    ("betainc(0.3, 2.5, 4)", "scipy.special.betainc(2.5, 4, 0.3)", special.betainc(2.5, 4, 0.3)),
    ("chi_square(7.8, 3)", "scipy.stats.chi2.cdf(7.8, 3)", stats.chi2.cdf(7.8, 3)),
    ("normalcdf(1.7, 0.5, 0.8)", "scipy.stats.norm.cdf(1.7, 0.5, 0.8)", stats.norm.cdf(1.7, 0.5, 0.8)),
    ("normalpdf(1.7, 0.5, 0.8)", "scipy.stats.norm.pdf(1.7, 0.5, 0.8)", stats.norm.pdf(1.7, 0.5, 0.8)),
    ("erf(0.43)", "scipy.special.erf(0.43)", special.erf(0.43)),
    ("erfc(2.2)", "scipy.special.erfc(2.2)", special.erfc(2.2)),
    ("erfinv(0.72)", "scipy.special.erfinv(0.72)", special.erfinv(0.72)),
    ("gamma(4.3)", "scipy.special.gamma(4.3)", special.gamma(4.3)),
    ("loggamma(37.5)", "scipy.special.gammaln(37.5)", special.gammaln(37.5)),
    ("digamma(2.6)", "scipy.special.digamma(2.6)", special.digamma(2.6)),
    ("beta(2.2, 3.7)", "scipy.special.beta(2.2, 3.7)", special.beta(2.2, 3.7)),
    ("besselj0(3.1)", "scipy.special.j0(3.1)", special.j0(3.1)),
    ("besselj1(3.1)", "scipy.special.j1(3.1)", special.j1(3.1)),
    ("bessely0(2.4)", "scipy.special.y0(2.4)", special.y0(2.4)),
    ("bessely1(2.4)", "scipy.special.y1(2.4)", special.y1(2.4)),
    ("besseli0(1.9)", "scipy.special.i0(1.9)", special.i0(1.9)),
    ("besseli1(1.9)", "scipy.special.i1(1.9)", special.i1(1.9)),
    ("besselk0(0.7)", "scipy.special.k0(0.7)", special.k0(0.7)),
    ("besselk1(0.7)", "scipy.special.k1(0.7)", special.k1(0.7)),
    ("besselj(5.5, 3)", "scipy.special.jv(3, 5.5)", special.jv(3, 5.5)),
    ("bessely(5.5, 3)", "scipy.special.yv(3, 5.5)", special.yv(3, 5.5)),
    ("besseli(1.2, 2)", "scipy.special.iv(2, 1.2)", special.iv(2, 1.2)),
    ("besselk(1.2, 2)", "scipy.special.kv(2, 1.2)", special.kv(2, 1.2)),
    # each Bessel kernel across its small-x, crossover and asymptotic regimes;
    # K stops at 40, where it is 1e-19 — the engine reports |v| < ~1e-30 as 0
    *[(f"{f}({x!r})", f"scipy.special.{g}({x!r})", getattr(special, g)(x))
      for f, g, xs in (("besselj0", "j0", (1e-4, 1.0, 7.9, 8.1, 60.0, 400.0)),
                       ("besselj1", "j1", (1e-4, 1.0, 7.9, 8.1, 60.0, 400.0)),
                       ("bessely0", "y0", (1e-4, 1.0, 7.9, 8.1, 60.0, 400.0)),
                       ("bessely1", "y1", (1e-4, 1.0, 7.9, 8.1, 60.0, 400.0)),
                       ("besseli0", "i0", (1e-4, 1.0, 3.7, 3.8, 60.0, 400.0)),
                       ("besseli1", "i1", (1e-4, 1.0, 3.7, 3.8, 60.0, 400.0)),
                       ("besselk0", "k0", (1e-6, 0.01, 1.9, 2.1, 9.0, 40.0)),
                       ("besselk1", "k1", (1e-6, 0.01, 1.9, 2.1, 9.0, 40.0)))
      for x in xs],
    *[(f"bessel{k}({x!r}, {n})", f"scipy.special.{g}({n}, {x!r})", getattr(special, g)(n, x))
      for k, g in (("y", "yn"), ("k", "kn")) for n in (2, 7) for x in (0.3, 5.0, 30.0)],
    # descriptive statistics
    (f"mean({args(x)})", "numpy.mean(x)", np.mean(x)),
    (f"median({args(x)})", "numpy.median(x)", np.median(x)),
    (f"variance({args(x)})", "numpy.var(x, ddof=1)", np.var(x, ddof=1)),
    (f"stdev({args(x)})", "numpy.std(x, ddof=1)", np.std(x, ddof=1)),
    (f"rms({args(x)})", "sqrt(mean(x**2))", math.sqrt(np.mean(np.square(x)))),
    (f"percentile(10, {args(x)})", "numpy.percentile(x, 10, method='weibull')", np.percentile(x, 10, method="weibull")),
    (f"percentile(37.5, {args(x)})", "numpy.percentile(x, 37.5, method='weibull')", np.percentile(x, 37.5, method="weibull")),
    (f"percentile(90, {args(x)})", "numpy.percentile(x, 90, method='weibull')", np.percentile(x, 90, method="weibull")),
    (f"skewness({args(x)})", "scipy.stats.skew(x, bias=False)", stats.skew(x, bias=False)),
    (f"kurtosis({args(x)})", "scipy.stats.kurtosis(x, fisher=True, bias=False)", stats.kurtosis(x, fisher=True, bias=False)),
    (f"mad({args(x)})", "scipy.stats.median_abs_deviation(x, scale=1.0)", stats.median_abs_deviation(x, scale=1.0)),
    (f"trimmedmean(0.1, {lit(x)})", "scipy.stats.trim_mean(x, 0.1)", stats.trim_mean(x, 0.1)),
    (f"wmean({lit(w)}, {lit(x)})", "statsmodels DescrStatsW(x, weights=w).mean", sm.stats.DescrStatsW(np.array(x), weights=np.array(w)).mean),
    (f"wvar({lit(w)}, {lit(x)})", "numpy.cov(x, aweights=w, ddof=1)", np.cov(x, aweights=w, ddof=1)),
    # correlation and regression
    (f"cov({lit(x)}, {lit(y)})", "numpy.cov(x, y, ddof=1)[0, 1]", np.cov(x, y, ddof=1)[0, 1]),
    (f"pearson({lit(x)}, {lit(y)})", "scipy.stats.pearsonr(x, y).statistic", stats.pearsonr(x, y).statistic),
    (f"spearman({lit(x)}, {lit(y)})", "scipy.stats.spearmanr(x, y).statistic", stats.spearmanr(x, y).statistic),
    (f"slope({lit(x)}, {lit(y)})", "scipy.stats.linregress(x, y).slope", lr.slope),
    (f"intercept({lit(x)}, {lit(y)})", "scipy.stats.linregress(x, y).intercept", lr.intercept),
    (f"r2({lit(x)}, {lit(y)})", "scipy.stats.linregress(x, y).rvalue**2", lr.rvalue ** 2),
    # hypothesis tests and intervals
    (f"ttest1_stat(9, {lit(x)})", "scipy.stats.ttest_1samp(x, 9).statistic", t1.statistic),
    (f"ttest1_pval(9, {lit(x)})", "scipy.stats.ttest_1samp(x, 9).pvalue", t1.pvalue),
    (f"ttest1_df(9, {lit(x)})", "scipy.stats.ttest_1samp(x, 9).df", t1.df),
    (f"ttest_paired_stat({lit(before)}, {lit(after)})", "scipy.stats.ttest_rel(before, after).statistic", tp.statistic),
    (f"ttest_paired_pval({lit(before)}, {lit(after)})", "scipy.stats.ttest_rel(before, after).pvalue", tp.pvalue),
    (f"ttest_paired_df({lit(before)}, {lit(after)})", "scipy.stats.ttest_rel(before, after).df", tp.df),
    (f"ttest2_stat({lit(g1)}, {lit(g2)})", "scipy.stats.ttest_ind(g1, g2, equal_var=False).statistic", tw.statistic),
    (f"ttest2_pval({lit(g1)}, {lit(g2)})", "scipy.stats.ttest_ind(g1, g2, equal_var=False).pvalue", tw.pvalue),
    (f"ttest2_df({lit(g1)}, {lit(g2)})", "scipy.stats.ttest_ind(g1, g2, equal_var=False).df", tw.df),
    (f"anova1_f({lit(g1)}, {lit(g2)}, {lit(g3)})", "scipy.stats.f_oneway(g1, g2, g3).statistic", an.statistic),
    (f"anova1_pval({lit(g1)}, {lit(g2)}, {lit(g3)})", "scipy.stats.f_oneway(g1, g2, g3).pvalue", an.pvalue),
    (f"anova1_df_between({lit(g1)}, {lit(g2)}, {lit(g3)})", "k - 1", 2.0),
    (f"anova1_df_within({lit(g1)}, {lit(g2)}, {lit(g3)})", "N - k", float(len(g1) + len(g2) + len(g3) - 3)),
    (f"chi2gof_stat({lit(observed)}, {lit(expected)})", "scipy.stats.chisquare(obs, exp).statistic", cg.statistic),
    (f"chi2gof_pval({lit(observed)}, {lit(expected)})", "scipy.stats.chisquare(obs, exp).pvalue", cg.pvalue),
    (f"chi2gof_df({lit(observed)}, {lit(expected)})", "k - 1", float(len(observed) - 1)),
    (f"ci_mean_lo(0.95, {lit(x)})", "statsmodels DescrStatsW(x).tconfint_mean(0.05)[0]", ci[0]),
    (f"ci_mean_hi(0.95, {lit(x)})", "statsmodels DescrStatsW(x).tconfint_mean(0.05)[1]", ci[1]),
]

# ── Polynomial least squares ────────────────────────────────────────────────

px = [round(0.25 * i, 2) for i in range(21)]
py = [round(0.4 - 1.1 * t + 0.35 * t * t - 0.02 * t ** 3 + e, 4) for t, e in zip(px, sample(21, 0.0, 0.05))]
polyfit = [
    {"x": px, "y": py, "degree": d,
     "coefficients": [float(c) for c in np.polynomial.polynomial.polyfit(px, py, d)],
     "reference": "numpy.polynomial.polynomial.polyfit (constant term first)"}
    for d in (1, 2, 3)
]

# ── Curve fitting ───────────────────────────────────────────────────────────

cx = [round(0.2 * i, 2) for i in range(30)]
true = (5.0, 0.8, 1.0)
cy = [round(true[0] * math.exp(-true[1] * t) + true[2] + e, 4) for t, e in zip(cx, sample(30, 0.0, 0.05))]
csig = [round(0.03 + 0.02 * t / 6, 4) for t in cx]
# Three gross outliers for the robust losses.
cy_out = list(cy)
for i, bump in ((4, 1.5), (13, -1.2), (22, 2.0)):
    cy_out[i] = round(cy_out[i] + bump, 4)

X = np.array(cx)


def expdecay(t, a, b, c):
    return a * np.exp(-b * t) + c


def expdecay_jac(t, a, b, c):
    e = np.exp(-b * t)
    return np.column_stack([e, -a * t * e, np.ones_like(t)])


def bands(jac, cov, fitted, point_var, dof, conf=0.95):
    tq = stats.t.ppf(1 - (1 - conf) / 2, dof)
    var = np.einsum("ij,jk,ik->i", jac, cov, jac)
    se_fit, se_new = np.sqrt(var), np.sqrt(var + point_var)
    return ([list(fitted - tq * se_fit), list(fitted + tq * se_fit)],
            [list(fitted - tq * se_new), list(fitted + tq * se_new)])


TIGHT = dict(ftol=1e-15, xtol=1e-15, gtol=1e-15)
curvefit = []

# Unweighted: covariance scaled by SSres/(n-p).
popt, pcov = optimize.curve_fit(expdecay, X, cy, p0=[4, 1, 0.5], jac=expdecay_jac, method="lm", **TIGHT)
fit = expdecay(X, *popt)
s2 = float(np.sum((np.array(cy) - fit) ** 2) / (len(cx) - 3))
cb, pb = bands(expdecay_jac(X, *popt), pcov, fit, s2, len(cx) - 3)
curvefit.append({"name": "exp_decay_ols", "model": "y = a*exp(-b*x) + c", "x": cx, "y": cy,
                 "initial_guess": [4, 1, 0.5], "parameters_ref": list(popt), "covariance": pcov.tolist(),
                 "confidence_band": cb, "prediction_band": pb,
                 "reference": "scipy.optimize.curve_fit(method='lm', analytic jac); bands by the delta method with t(0.975, n-p)"})

# Weighted with absolute sigma.
popt, pcov = optimize.curve_fit(expdecay, X, cy, p0=[4, 1, 0.5], sigma=csig, absolute_sigma=True,
                                jac=expdecay_jac, method="lm", **TIGHT)
fit = expdecay(X, *popt)
cb, pb = bands(expdecay_jac(X, *popt), pcov, fit, np.square(csig), len(cx) - 3)
curvefit.append({"name": "exp_decay_absolute_sigma", "model": "y = a*exp(-b*x) + c", "x": cx, "y": cy,
                 "sigma": csig, "initial_guess": [4, 1, 0.5], "parameters_ref": list(popt), "covariance": pcov.tolist(),
                 "confidence_band": cb, "prediction_band": pb,
                 "reference": "scipy.optimize.curve_fit(sigma, absolute_sigma=True, method='lm', analytic jac)"})

# Linear in its parameters: statsmodels OLS is the reference for covariance and bands.
design = sm.add_constant(np.column_stack([X, X ** 2]))
ols = sm.OLS(np.array(cy), design).fit()
pred = ols.get_prediction(design)
curvefit.append({"name": "quadratic_ols_statsmodels", "model": "y = a + b*x + c*x^2", "x": cx, "y": cy,
                 "initial_guess": [1, 1, 1], "parameters_ref": list(ols.params), "covariance": ols.cov_params().tolist(),
                 "confidence_band": [list(v) for v in pred.conf_int(obs=False, alpha=0.05).T],
                 "prediction_band": [list(v) for v in pred.conf_int(obs=True, alpha=0.05).T],
                 "reference": "statsmodels OLS: params, cov_params(), get_prediction().conf_int(obs=False/True)"})

# An active bound: c is held below its unconstrained optimum.
res = optimize.least_squares(lambda p: expdecay(X, *p) - cy, [4, 1, 0.5], jac=lambda p: expdecay_jac(X, *p),
                             bounds=([0, 0, 0], [10, 5, 0.9]), method="trf", **TIGHT)
curvefit.append({"name": "exp_decay_bounded", "model": "y = a*exp(-b*x) + c", "x": cx, "y": cy,
                 "initial_guess": [4, 1, 0.5], "lower": [0, 0, 0], "upper": [10, 5, 0.9],
                 "parameters_ref": list(res.x), "active_mask": [int(v) for v in res.active_mask],
                 "reference": "scipy.optimize.least_squares(method='trf', bounds)"})

# Robust losses with a fixed scale, on data with three gross outliers.
for loss in ("soft_l1", "huber", "cauchy"):
    res = optimize.least_squares(lambda p: expdecay(X, *p) - cy_out, [4, 1, 0.5], jac=lambda p: expdecay_jac(X, *p),
                                 loss=loss, f_scale=0.1, method="trf", **TIGHT)
    curvefit.append({"name": f"exp_decay_{loss}", "model": "y = a*exp(-b*x) + c", "x": cx, "y": cy_out,
                     "initial_guess": [4, 1, 0.5], "loss": loss, "f_scale": 0.1, "parameters_ref": list(res.x),
                     "reference": f"scipy.optimize.least_squares(loss='{loss}', f_scale=0.1)"})

# ── Signal processing ───────────────────────────────────────────────────────

sig = {}
for n in (12, 64, 100):
    re, im = sample(n), sample(n)
    z = np.array(re) + 1j * np.array(im)
    f, fi = np.fft.fft(z), np.fft.ifft(z)
    sig[f"dft_{n}"] = {"re": re, "im": im, "forward": [list(f.real), list(f.imag)],
                       "inverse": [list(fi.real), list(fi.imag)], "reference": "numpy.fft.fft / ifft"}
a7, b4 = sample(7), sample(4)
sig["convolve"] = {"a": a7, "b": b4, "out": list(np.convolve(a7, b4)), "reference": "numpy.convolve(a, b, 'full')"}
sig["xcorr"] = {"a": a7, "b": b4, "out": list(np.correlate(a7, b4, "full")), "reference": "numpy.correlate(a, b, 'full')"}
sig["windows"] = [
    {"kind": k, "n": n, "periodic": per, "weights": list(signal.get_window(name, n, fftbins=per)),
     "reference": f"scipy.signal.get_window('{name}', {n}, fftbins={per})"}
    for k, name in (("hann", "hann"), ("hamming", "hamming"), ("blackman", "blackman"), ("bartlett", "bartlett"), ("rect", "boxcar"))
    for n in (9, 16) for per in (False, True)
]
trend = [round(0.3 * i + 2.0 + e, 4) for i, e in enumerate(sample(20, 0.0, 0.5))]
sig["detrend"] = {"y": trend, "constant": list(signal.detrend(trend, type="constant")),
                  "linear": list(signal.detrend(trend, type="linear")), "reference": "scipy.signal.detrend"}
ma = sample(15)
k = 5
sig["moving_average"] = {"x": ma, "k": k,
                         "out": list(np.convolve(ma, np.ones(k), "same") / np.convolve(np.ones(len(ma)), np.ones(k), "same")),
                         "reference": "numpy.convolve(x, ones(k), 'same') / numpy.convolve(ones(n), ones(k), 'same')"}
fb, fa = signal.butter(2, 0.2)
fx = [round(math.sin(0.15 * i) + e, 4) for i, e in enumerate(sample(60, 0.0, 0.3))]
sig["filter"] = {"b": list(fb), "a": list(fa), "x": fx,
                 "lfilter": list(signal.lfilter(fb, fa, fx)),
                 "filtfilt": list(signal.filtfilt(fb, fa, fx)),
                 "reference": "scipy.signal.butter(2, 0.2); lfilter; "
                              "and scipy.signal.filtfilt with its default odd padding and lfilter_zi start"}
wx = [round(math.sin(2 * math.pi * 12.5 * i / 100) + e, 4) for i, e in enumerate(sample(256, 0.0, 0.5))]
wf, wp = signal.welch(np.array(wx), fs=100.0, nperseg=64)
sig["welch"] = {"x": wx, "fs": 100.0, "nperseg": 64, "f": list(wf), "pxx": list(wp),
                "reference": "scipy.signal.welch(x, fs=100, nperseg=64) — hann, 50% overlap, constant detrend, density"}
peaks_x = sample(60)
pk, _ = signal.find_peaks(np.array(peaks_x), height=0.2, distance=4)
sig["peaks"] = {"x": peaks_x, "min_height": 0.2, "min_distance": 4, "indices": [int(i) for i in pk],
                "reference": "scipy.signal.find_peaks(x, height=0.2, distance=4)"}

# ── Sobol' points ───────────────────────────────────────────────────────────

SOBOL_DIMS, SOBOL_N = 32, 256
pts = qmc.Sobol(SOBOL_DIMS, scramble=False, bits=32).random(SOBOL_N)
sobol_points = {"dimensions": SOBOL_DIMS, "n": SOBOL_N,
                "points_u32": [[int(round(v * 2 ** 32)) for v in row] for row in pts],
                "reference": "scipy.stats.qmc.Sobol(d, scramble=False, bits=32).random(n) — Joe & Kuo new-joe-kuo-6.21201"}


# ── frees' own designs, rebuilt so SALib grades the estimator on its points ─

class JavaRandom:
    """java.util.Random, as `analysis::montecarlo::JavaRandom` ports it."""
    MULT, ADD, MASK = 0x5DEECE66D, 0xB, (1 << 48) - 1

    def __init__(self, seed):
        self.seed = ((seed & ((1 << 64) - 1)) ^ self.MULT) & self.MASK

    def next(self, bits):
        self.seed = (self.seed * self.MULT + self.ADD) & self.MASK
        return self.seed >> (48 - bits)

    def next_double(self):
        return ((self.next(26) << 27) + self.next(27)) * 2.0 ** -53

    def next_u32(self):
        return self.next(32)


def frees_sobol_design(n, dims, seed):
    r = JavaRandom(seed)
    shifts = [r.next_u32() for _ in range(dims)]
    raw = qmc.Sobol(dims, scramble=False, bits=32).random(n)
    floor = np.finfo(float).eps / 2
    return [[min(max((int(round(v * 2 ** 32)) ^ s) / 2 ** 32, floor), 1 - floor) for v, s in zip(row, shifts)]
            for row in raw]


def ishigami(p, a=7.0, b=0.1):
    return math.sin(p[0]) + a * math.sin(p[1]) ** 2 + b * p[2] ** 4 * math.sin(p[0])


ISH_N, ISH_SEED, LO, HI = 1024, 42, -math.pi, math.pi
rows = frees_sobol_design(ISH_N, 6, ISH_SEED)
Y = []
for row in rows:
    a_, b_ = row[:3], row[3:]
    mats = [a_] + [[b_[i] if j == i else a_[j] for j in range(3)] for i in range(3)] + [b_]
    Y += [ishigami([LO + u * (HI - LO) for u in m]) for m in mats]
Y = np.array(Y)
problem = {"num_vars": 3, "names": ["x1", "x2", "x3"], "bounds": [[LO, HI]] * 3}
si = salib_sobol.analyze(problem, Y, calc_second_order=False, num_resamples=10, seed=1)
sobol_indices = {"model": "ishigami(a=7, b=0.1)", "bounds": [LO, HI], "base_samples": ISH_N, "seed": ISH_SEED,
                 "centre": float(Y.mean()), "s1": list(si["S1"]), "st": list(si["ST"]),
                 "reference": "SALib.analyze.sobol(calc_second_order=False) on frees' own A/B/AB design; SALib "
                              "standardises Y by its global mean, which frees reproduces by subtracting `centre`"}

M_LEVELS, M_TRAJ, M_SEED = 4, 12, 7
M_BOUNDS = [(0.0, 1.0), (-2.0, 3.0), (10.0, 20.0), (0.0, math.pi)]


def morris_model(p):
    return p[0] + 2.0 * p[1] ** 2 + 0.1 * p[0] * p[2] - 3.0 * math.sin(p[3])


r = JavaRandom(M_SEED)
delta = M_LEVELS / (2.0 * (M_LEVELS - 1.0))
grid_max = float(M_LEVELS // 2)
MX, MY = [], []
for _ in range(M_TRAJ):
    cur = [math.floor(r.next_double() * grid_max) / (M_LEVELS - 1.0) for _ in M_BOUNDS]
    order = list(range(len(M_BOUNDS)))
    for i in range(len(order) - 1, 0, -1):
        j = int(r.next_double() * (i + 1))
        order[i], order[min(j, i)] = order[min(j, i)], order[i]
    traj = [list(cur)]
    for i in order:
        cur[i] += delta
        traj.append(list(cur))
    for u in traj:
        v = [lo + ui * (hi - lo) for ui, (lo, hi) in zip(u, M_BOUNDS)]
        MX.append(v)
        MY.append(morris_model(v))
mi = salib_morris.analyze({"num_vars": 4, "names": ["p1", "p2", "p3", "p4"], "bounds": [list(b) for b in M_BOUNDS]},
                          np.array(MX), np.array(MY), num_levels=M_LEVELS, num_resamples=10, seed=1)
morris = {"model": "p1 + 2*p2^2 + 0.1*p1*p3 - 3*sin(p4)", "bounds": M_BOUNDS, "levels": M_LEVELS,
          "trajectories": M_TRAJ, "seed": M_SEED, "mu": list(mi["mu"]), "mu_star": list(mi["mu_star"]),
          "sigma": list(mi["sigma"]),
          "reference": "SALib.analyze.morris(num_levels=4, scaled=False) on frees' own trajectories"}

json.dump({
    "generator": "tools/stats-ref/gen.py",
    "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__,
                 "statsmodels": statsmodels.__version__, "SALib": version("SALib")},
    "seed": SEED,
    "scalar": [{"expr": e, "reference": r_, "value": float(v)} for e, r_, v in scalar],
    "polyfit": polyfit,
    "curvefit": curvefit,
    "signal": sig,
    "sobol_points": sobol_points,
    "sobol_indices": sobol_indices,
    "morris": morris,
}, sys.stdout, indent=1, default=float)
sys.stdout.write("\n")
