# Third-Party Notices

frees itself is MIT-licensed (see [LICENSE](LICENSE)). It links, bundles, or
invokes the third-party components below, which remain under their own
licenses. This file lists the notable ones; the authoritative, complete lists
are the Gradle dependency graph (`backend/*/build.gradle`) and
`frontend/package-lock.json`.

## Backend libraries (Maven Central)

| Component | Version | License |
|---|---|---|
| ANTLR 4 (`org.antlr:antlr4`, `antlr4-runtime`) | 4.13.2 | BSD-3-Clause |
| JGraphT (`org.jgrapht:jgrapht-core`) | 1.5.3 | Dual EPL-2.0 / LGPL-2.1 |
| Apache Commons Math (`org.apache.commons:commons-math3`) | 3.6.1 | Apache-2.0 |
| JNA (`net.java.dev.jna:jna`) | 5.19.1 | Dual Apache-2.0 / LGPL-2.1 |
| Apache XML Graphics FOP transcoder (`org.apache.xmlgraphics:fop-transcoder`) | 2.11 | Apache-2.0 |
| Jackson Databind (`com.fasterxml.jackson.core:jackson-databind`) | 2.22.1 | Apache-2.0 |
| Symja / matheclipse (`org.matheclipse:matheclipse-core`) | 3.2.0 | LGPL-3.0 |
| SLF4J (`org.slf4j:slf4j-api`) | 2.0.18 | MIT |
| mdf4j (`de.richardliebscher.mdf4j:mdf4j`) | 0.2.0 | Apache-2.0 |
| Spring Boot (`org.springframework.boot:*`, web module) | 4.1.0 | Apache-2.0 |

### LGPL note

matheclipse-core (LGPL-3.0) and JGraphT (used under LGPL-2.1) are consumed as
**unmodified jars, dynamically linked** on the Java classpath and resolved from
Maven Central by coordinates — a user can substitute their own build of either
library through standard Gradle dependency substitution, which is the
relinking freedom those licenses require. JNA is used under its Apache-2.0
option. No LGPL source has been modified or copied into this repository.

## Native libraries

| Component | How it ships | License |
|---|---|---|
| CoolProp | Vendored prebuilt binary `backend/core/native/libCoolProp.so`, loaded at runtime via JNA | MIT — <https://github.com/CoolProp/CoolProp> |
| SUNDIALS (IDA, KLU interface) | System packages (`libsundials-dev`, Ubuntu 24.04), loaded optionally at runtime via JNA | BSD-3-Clause — <https://github.com/LLNL/sundials> |

The vendored `libCoolProp.so` is an unmodified upstream build; CoolProp's MIT
license and copyright notice apply to it.

## MDF sidecar (Python service)

The optional `mdf-sidecar` container installs, at image build time,
**asammdf** (LGPL-3.0), **FastAPI** (MIT), and their dependencies. It is a
separate process reached over private HTTP, not linked into the Java or
JavaScript code.

## Frontend

Frontend dependencies are declared in `frontend/package.json` and are
permissively licensed throughout — notably React, Mantine, CodeMirror 6,
Plotly.js, KaTeX, Excalidraw, dockview and uPlot (MIT) and Univer
(Apache-2.0). See `frontend/package-lock.json` for the full tree.
