---
name: SigNoise
category: Component (signal)
summary: "Seeded Gaussian noise: samples of standard deviation sigma every dt, joined linearly, the same on every run."
related: [SigFirstOrder, randg]
examples: []
tags: [signoise, component, signal, acausal]
references: ["D. E. Knuth, The Art of Computer Programming, Vol. 2: Seminumerical Algorithms, 3rd ed., Addison-Wesley, 1997 (linear congruential generators and the polar method)"]
---

# SigNoise

Seeded Gaussian noise: samples of standard deviation sigma every dt, joined linearly, the same on every run.

## What it models

A reproducible noise source. Sample k is the first Gaussian draw of `java.util.Random` seeded with mod(k·2654435761 + seed·40503, 2147483647) + 1, the same generator `randg` uses, so a given seed gives the same trace on every run and on every target. The samples are joined linearly, so the signal is continuous and an integrator never meets a jump; its spectrum is band-limited to about 1/(2·dt). The multiplicative seed mix is there because Java's first draws for consecutive seeds are almost identical (lag-one correlation 0.999 for seed + k, against −0.03 with the mix, measured over 5,000 samples).

## Domain

A **causal signal-domain** block — each port carries one value `sig`; a signal wire copies the output's value to the inputs it feeds. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
SigNoise inst(sigma, dt, seed)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `sigma` | Number | Standard deviation of the samples [-]. |
| `dt` | Number | Time between samples [s]. |
| `seed` | Number | Run identity: any non-negative integer [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.sig &= \text{randg}\left(0, sigma, \text{mod}\left(\text{floor}\left(\frac{time}{dt}\right)\cdot 2654435761 + seed\cdot 40503, 2147483647\right) + 1\right)\cdot \left(1 + \text{floor}\left(\frac{time}{dt}\right) - \frac{time}{dt}\right) + \text{randg}\left(0, sigma, \text{mod}\left(\left(\text{floor}\left(\frac{time}{dt}\right) + 1\right)\cdot 2654435761 + seed\cdot 40503, 2147483647\right) + 1\right)\cdot \left(\frac{time}{dt} - \text{floor}\left(\frac{time}{dt}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — the same draw as randg, halfway between samples

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ Seeded noise, σ = 1, a sample every 10 ms, seed 42. Sample k is the first
  Gaussian draw of java.util.Random seeded with
  mod(k·2654435761 + seed·40503, 2147483647) + 1, so it is the same on every
  run. At t = 0 the output is sample 0. Halfway between samples 1 and 2 it is
  their average, drawn here directly with randg for comparison. }
time = 0.015 [s]
SigNoise NZ(sigma=1, dt=0.01 [s], seed=42)
n_mid    = NZ.out.sig
n_direct = 0.5 * (randg(0, 1, 508653241) + randg(0, 1, 1015605355))
n_gap    = n_mid - n_direct

{ CHECK n_mid 0.00029017144404624995 1e-12 }
{ CHECK n_gap 0 1e-15 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
n_mid = 0.00029017144404624995
n_gap = 0
```

<!-- verified-reference-example:end -->
