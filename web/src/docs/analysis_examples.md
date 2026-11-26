# Verified Analysis Examples

Each block below is a complete request: the model `text`, the settings the Tools window would send, and the results the documentation run (`npm run check-examples`) asserts. The Monte Carlo, Parameter Estimation, Global Sensitivity and Curve Fit windows send the same requests.

## Analysis example 1: Monte Carlo with a declared distribution

```json
{
  "operation": "monte_carlo",
  "request": {
    "samples": 256,
    "seed": 42,
    "design": "lhs",
    "variableInfo": [
      {
        "name": "area",
        "guess": 0.001774,
        "lower": 0.0015966,
        "upper": 0.0019514,
        "uncertainty": 0.00010242193775423962
      }
    ]
  },
  "checks": [
    {
      "path": "failedSamples",
      "value": 0,
      "tolerance": 0
    },
    {
      "path": "requestedSamples",
      "value": 256,
      "tolerance": 0
    },
    {
      "path": "stats.0.mean",
      "value": 35.48,
      "tolerance": 0.02
    },
    {
      "path": "stats.0.sigma",
      "value": 2.048438754,
      "tolerance": 0.02
    },
    {
      "path": "stats.0.p5",
      "value": 32.2868,
      "tolerance": 0.04
    },
    {
      "path": "stats.0.p95",
      "value": 38.6732,
      "tolerance": 0.04
    }
  ],
  "text": "area = 0.001774\nforce = 20000*area\nDistributionOf(area) = Uniform(0.0015966, 0.0019514)\n"
}
```

## Analysis example 2: Dynamic calibration with Parameter Estimation

Parameter Estimation fits `k` so the `cooling` block's `Temp` column passes through thirteen measured temperatures, each weighted by its own `sigma`. The measurements were made with `k = 0.05`, so the fit recovers it from a start of 0.2.

```json
{
  "operation": "parameter_fit",
  "request": {
    "text": "k = 0.2\nambient = 293.15\nDYNAMIC cooling(method=ode45, time=0..60, points=61)\n der(Temp) = -k*(Temp-ambient)\n Temp(0) = 368.15\nEND\n",
    "parameters": [
      "k"
    ],
    "initial": [
      0.2
    ],
    "lower": [
      0.001
    ],
    "upper": [
      1.0
    ],
    "odeBlock": "cooling",
    "column": "temp",
    "measuredT": [
      0,
      5,
      10,
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50,
      55,
      60
    ],
    "measuredV": [
      368.15,
      351.56005873,
      338.639799478,
      328.577491456,
      320.740958088,
      314.637859765,
      309.884762011,
      306.183045759,
      303.300146243,
      301.054941842,
      299.306374897,
      297.944589591,
      296.884030128
    ],
    "sigma": [
      0.2,
      0.25,
      0.3,
      0.35,
      0.4,
      0.45,
      0.5,
      0.55,
      0.6,
      0.65,
      0.7,
      0.75,
      0.8
    ],
    "loss": "linear",
    "fScale": 1,
    "maxEvaluations": 200
  },
  "checks": [
    {
      "path": "fittedValues.0",
      "value": 0.05,
      "tolerance": 0.0001
    },
    {
      "path": "rmse",
      "value": 0,
      "tolerance": 0.01
    },
    {
      "path": "residualDof",
      "value": 12,
      "tolerance": 0
    },
    {
      "path": "rank",
      "value": 1,
      "tolerance": 0
    }
  ]
}
```

## Analysis example 3: Sobol' indices

Sobol' and Morris assume independent inputs and refuse a document with a `Correlation` declaration, so examples 3 and 4 run the heat-loss model without it. Use Monte Carlo (example 5) when the inputs are correlated.

```json
{
  "operation": "sensitivity",
  "request": {
    "method": "sobol",
    "samples": 1024,
    "design": "sobol",
    "bootstrap": 64,
    "seed": 42,
    "variableInfo": [
      {
        "name": "inside_temp",
        "guess": 293.15,
        "lower": 292.15,
        "upper": 294.15,
        "uncertainty": 0.5773502691896258
      },
      {
        "name": "outside_temp",
        "guess": 273.15,
        "lower": 271.15,
        "upper": 275.15,
        "uncertainty": 1.1547005383792517
      }
    ]
  },
  "checks": [
    {
      "path": "outputs.0.indices.0.firstOrder",
      "value": 0.2,
      "tolerance": 0.03
    },
    {
      "path": "outputs.0.indices.0.total",
      "value": 0.2,
      "tolerance": 0.03
    },
    {
      "path": "outputs.0.indices.1.firstOrder",
      "value": 0.8,
      "tolerance": 0.03
    },
    {
      "path": "outputs.0.indices.1.total",
      "value": 0.8,
      "tolerance": 0.03
    }
  ],
  "text": "inside_temp = 293.15\noutside_temp = 273.15\nheat_loss = 10*(inside_temp-outside_temp)\nheat_deviation = heat_loss-200\nDistributionOf(inside_temp) = Uniform(292.15, 294.15)\nDistributionOf(outside_temp) = Uniform(271.15, 275.15)\n"
}
```

## Analysis example 4: Morris screening

```json
{
  "operation": "sensitivity",
  "request": {
    "method": "morris",
    "trajectories": 20,
    "levels": 6,
    "seed": 42,
    "variableInfo": [
      {
        "name": "inside_temp",
        "guess": 293.15,
        "lower": 292.15,
        "upper": 294.15,
        "uncertainty": 0.5773502691896258
      },
      {
        "name": "outside_temp",
        "guess": 273.15,
        "lower": 271.15,
        "upper": 275.15,
        "uncertainty": 1.1547005383792517
      }
    ]
  },
  "checks": [
    {
      "path": "outputs.0.effects.0.mu",
      "value": 20,
      "tolerance": 1e-06
    },
    {
      "path": "outputs.0.effects.1.mu",
      "value": -40,
      "tolerance": 1e-06
    },
    {
      "path": "outputs.0.effects.0.sigma",
      "value": 0,
      "tolerance": 1e-06
    },
    {
      "path": "outputs.0.effects.1.sigma",
      "value": 0,
      "tolerance": 1e-06
    }
  ],
  "text": "inside_temp = 293.15\noutside_temp = 273.15\nheat_loss = 10*(inside_temp-outside_temp)\nheat_deviation = heat_loss-200\nDistributionOf(inside_temp) = Uniform(292.15, 294.15)\nDistributionOf(outside_temp) = Uniform(271.15, 275.15)\n"
}
```

## Analysis example 5: Monte Carlo with correlated inputs

This is the `correlated-temperature-heat-loss` example. Its first-order uncertainty already accounts for the correlation: σ = 10·√(0.2² + 0.3² − 2·0.5·0.2·0.3) = 2.65 W, against 3.61 W if the two readings were independent. Monte Carlo draws correlated samples and agrees: 1,000 samples give σ = 2.56 W.

Monte Carlo honours the document's `Correlation` declaration, but takes each input's uncertainty from the Variable Information window (`variableInfo` here), not from its `UncertaintyOf` line. Enter 0.2 K and 0.3 K there before **Tools → Monte Carlo**.

```json
{
  "operation": "monte_carlo",
  "request": {
    "samples": 1000,
    "seed": 42,
    "variableInfo": [
      {
        "name": "inside_temp",
        "units": "K",
        "uncertainty": 0.2
      },
      {
        "name": "outside_temp",
        "units": "K",
        "uncertainty": 0.3
      }
    ]
  },
  "checks": [
    {
      "path": "failedSamples",
      "value": 0,
      "tolerance": 0
    },
    {
      "path": "stats.0.mean",
      "value": 199.96168431318577,
      "tolerance": 0.0002
    },
    {
      "path": "stats.0.sigma",
      "value": 2.559250667084518,
      "tolerance": 3e-06
    },
    {
      "path": "stats.0.firstOrderSigma",
      "value": 2.645751325700319,
      "tolerance": 3e-06
    }
  ],
  "text": "inside_temp = 293.15 [K]\noutside_temp = 273.15 [K]\nheat_loss = 10 [W/K]*(inside_temp-outside_temp)\nUncertaintyOf(inside_temp) = 0.2\nUncertaintyOf(outside_temp) = 0.3\nCorrelation(inside_temp, outside_temp) = 0.5\nheat_sigma = UncertaintyOf(heat_loss)\n"
}
```

## Signal processing: drift, a spectrum and a taper

A sensor record often carries a slow drift on top of the signal. This one is an 8 Hz unit sine on a ramp of 0.05 per sample, 64 samples at 64 Hz. `Detrend` removes the least-squares line; `Welch` then finds the tone's power. `Welch` tapers each segment itself, so `Window` is for a single `FFT` of the whole record.

```frees
fs = 64           { samples per second }
f0 = 8            { tone, Hz }
FOR i = 1 TO 64
  t[i] = (i - 1) / fs
  x[i] = 0.05 * (i - 1) + sin(2 * pi# * f0 * t[i])
  zero[i] = 0
END
[xd] = Detrend(x[1:64])                 { drift removed }
[f, pxx] = Welch(xd[1:64], fs, 32)      { 17 bins, 2 Hz apart }
P_total = sum(pxx[1:17]) * (f[2] - f[1])
k_peak = peakindex(1, 0.01, 0, pxx[1:17])
f_peak = (k_peak - 1) * (f[2] - f[1])
[xw] = Window(xd[1:64], 'hann')
[X_re, X_im] = FFT(xw[1:64], zero[1:64])
A_8 = sqrt(X_re[9]^2 + X_im[9]^2)       { the 8 Hz bin }
A_12 = sqrt(X_re[13]^2 + X_im[13]^2)    { 4 Hz away: leakage }

{ CHECK f_peak 8 0 }
{ CHECK P_total 0.5000593179952793 6e-7 }
{ CHECK pxx[5] 0.16686658425672024 2e-7 }
{ CHECK A_8 15.75145797392816 2e-5 }
{ CHECK A_12 0.017319157262698472 2e-8 }
```

`P_total` is the sine's mean square, 0.5. `peakindex` returns the *first* local maximum, so its `minheight` of 0.01 steps over the small bump the detrend leaves at 2 Hz. With the Hann taper, the bin 4 Hz from the tone holds about a thousandth of the tone's amplitude.

## Regression: linfit, polyfit and the Curve Fit window

`linfit` and a degree-1 `polyfit` fit the same straight line. `polyfit` returns coefficients in ascending powers, so `c[1]` is the intercept.

```frees
x = [1, 2, 3, 4, 5, 6, 7]
y = [0.5, 2.5, 2.0, 4.0, 3.5, 6.0, 5.5]
[a_1, a_0, r_sq] = linfit(x, y)
[c] = polyfit(x, y, 1)
[q] = polyfit(x, y, 2)

{ CHECK a_1 0.8392857142857143 9e-7 }
{ CHECK a_0 0.07142857142857142 8e-8 }
{ CHECK r_sq 0.8683176100628931 9e-7 }
{ CHECK c[1] 0.07142857142857142 8e-8 }
{ CHECK c[2] 0.8392857142857143 9e-7 }
{ CHECK q[3] -0.02976190476190482 3e-8 }
```

**Tools → Curve Fit** fits a model to two columns of a workbook table. With these seven points in columns `x` and `y` and the model `y = a_0 + a_1*x`, it sends the request below and returns the same line.

```json
{
  "operation": "curve_fit",
  "request": {
    "model": "y = a_0 + a_1*x",
    "yVariable": "y",
    "xVariable": "x",
    "parameters": [
      "a_0",
      "a_1"
    ],
    "xData": [
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ],
    "yData": [
      0.5,
      2.5,
      2.0,
      4.0,
      3.5,
      6.0,
      5.5
    ],
    "initialGuess": [
      0,
      1
    ]
  },
  "checks": [
    {
      "path": "fittedParameters.0",
      "value": 0.07142857142857142,
      "tolerance": 1e-07
    },
    {
      "path": "fittedParameters.1",
      "value": 0.8392857142857143,
      "tolerance": 1e-06
    }
  ]
}
```
