---
name: GasMixer
category: Component (pneumatic)
summary: Mixes pneumatic gas streams, carrying the species composition rider.
related: []
examples: []
tags: [gasmixer, component, pneumatic, acausal]
references:
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# GasMixer

Mixes pneumatic gas streams, carrying the species composition rider.

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in1`, `in2`, `out`

## Usage

```
GasMixer inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in1.p \\
out.mdot &= in1.mdot + in2.mdot \\
out.mdot\cdot out.h &= in1.mdot\cdot in1.h + in2.mdot\cdot in2.h \\
out.mdot\cdot out.y &= in1.mdot\cdot in1.y + in2.mdot\cdot in2.y
\end{aligned}
$$

## References

1. ISO 6358 — Pneumatic fluid power: flow-rate characteristics.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
GasSource S1(a, y=1, mdot=2, P=100000, h0=300000)
GasSource S2(b, y=0, mdot=3, P=100000, h0=290000)
GasMixer  MIX(a, b, c)

{ CHECK a.h 300000 0.3 }
{ CHECK a.mdot 2 0.000002 }
{ CHECK a.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.h = 300000
a.mdot = 2
a.p = 100000
```

<!-- verified-reference-example:end -->
