# TODO

## Done

* ~~New ode implementation blocks are missing from the spotlight and functions menu. Also from editors autocomplete.~~
  → Added a **Dynamics (ODE)** catalog category (`der`, `ODEValue`, `FinalValue`, `MaxValue`, `MinValue`, `TimeAt`, `ODEAvg`, `ODESum`, `ODEStdDev`) plus a **DYNAMIC (ODE) block** scaffold. The catalog is the single source for spotlight, Functions menu, autocomplete and highlighting, so all three are fixed at once. Added `DYNAMIC`/`STATE`/`EVENT` to the editor keyword set.
* ~~ODE tables: should be able to change ode table units; the parametric-table explanation above ODE tables is misleading.~~
  → ODE tables now show an ODE-specific note (not the "PARAMETRIC … END" one) and their column **units are editable as display labels** (the ODE solver runs in SI, so values stay as solved).
* ~~Function and procedure definitions are misleading; support function blocks with multiple outputs (MATLAB-style).~~
  → Added `FUNCTION [a, b] = f(x) … END` (outputs assigned by name with `:=`) consumed MATLAB-style via `[p, q] = f(x)`. Lowered onto the existing procedure machinery. Catalog + Help + tests updated. (Single-output `FUNCTION f(x)` and `PROCEDURE` are unchanged.)
* ~~Arrays: use `1:3` / `0:15` instead of `1..3`.~~
  → Array index ranges now use colons (`A[1:3]`, `speed[1:N]`); `..` is retained only for DYNAMIC time spans (`t = 0 .. 600`). Grammar, builders, examples, help and tests updated.

## Open

*
