# Verified Analysis Examples

These requests are the four analysis examples drafted for Phase 4.7b.

## Analysis example 1

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

## Analysis example 2

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

## Analysis example 3

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

## Analysis example 4

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

