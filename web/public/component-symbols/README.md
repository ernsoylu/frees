# Engineering component symbols

[Editable Figma overview](https://www.figma.com/design/SHIyfVVicYxMCbXqzedk8Z?node-id=29-144) ·
[Labeled examples](https://www.figma.com/design/SHIyfVVicYxMCbXqzedk8Z?node-id=29-52)

[FREES dark set](https://www.figma.com/design/SHIyfVVicYxMCbXqzedk8Z?node-id=61-212) ·
[Dark examples](https://www.figma.com/design/SHIyfVVicYxMCbXqzedk8Z?node-id=61-440)

The 38 standalone SVGs are exported from Figma masters at 96 × 96. They use
monochrome strokes on a white tile; color is not required to interpret a symbol.
Original master IDs are preserved in set `29:22`; additional masters are in
frame `35:42`. All exports work offline without fonts or remote resources.

The matching 38 SVGs in `dark/` use the original FREES palette: teal
`#12B886` on dark surface `#2E2E2E`. Their geometry is identical to the
monochrome set. Figma dark masters live in frame `61:100` and bind to aliases
of the existing FREES teal and surface tokens. The editor follows Mantine's
resolved color scheme, including system preference; the schematic uses teal
glyphs on its dark canvas. Monochrome assets remain available in light mode.

## Drawing conventions and sources

These are simplified reference illustrations, not certified engineering drawings.
The convention is shown in the editor and Figma overview. Names refer to the
general function; actuator details, ratings, control states and internal model
networks are not encoded.

| Forms | Reference |
| --- | --- |
| Heat exchanger, tank/vessel | [ISO 10628-2:2012](https://www.iso.org/standard/51841.html); [preview](https://cdn.standards.iteh.ai/samples/51841/8eb426031e364fd49f1bd17e19a744dd/ISO-10628-2-2012.pdf), X8079 and 301. |
| Liquid pump, gas pump/compressor/fan, two-way process valve | ISO 14617 conventions. The gas symbol uses the converging lines inside a circle, distinct from the hydraulic energy triangle. [KiCad's ISO 14617 fan reference](https://gitlab.com/kicad/libraries/kicad-symbols/-/blob/9.0.7/Motor.kicad_sym) identifies form 2302. |
| Spring, gear pair, mass | ISO 14617 reference forms 2002, 2008 and 2001, visually checked in the [Part 7 preview](https://cdn.standards.iteh.ai/samples/33385/21ba8e50efe5470697990ef3e7d71b42/ISO-14617-7-2002.pdf). The old parts are superseded by [ISO 14617-2:2025](https://www.iso.org/standard/83364.html); the complete new edition has not been audited. |
| Hydraulic pump/motor, cylinders, vented reservoir, restriction, check valve | [ISO 1219-1](https://www.iso.org/standard/60184.html) fluid-power conventions. Pump triangles point outward; motor triangles point inward. Hydraulic triangles are filled, while the circle remains open. |
| Resistor, capacitor, inductor, battery, diode, fuse, motor, electrical reference | [IEC 60617](https://webstore.iec.ch/en/publication/2723), the electrical diagram standard. Public visual references: Autodesk's [resistors](https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Electrical/files/GUID-1D071951-D38E-4B15-8B9E-C30ECBD55C19.htm), [capacitors](https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Electrical/files/GUID-74580D46-0731-41A6-918D-2DB419114207.htm), [inductors](https://help.autodesk.com/cloudhelp/2016/ENU/AutoCAD-Electrical/files/GUID-BAD50DBF-0951-44A0-BB4C-A57B4A4ED895.htm) and [battery/ground](https://help.autodesk.com/cloudhelp/2016/ENU/AutoCAD-Electrical/files/GUID-1E3FDEAE-B4B2-417C-8075-108AA2C6E509.htm). |
| Thermal resistance (conduction, convection, radiation, contact), thermal capacitance (thermal and PCM masses) | The thermal–electrical analogy of heat-transfer texts' thermal circuits: the resistor form for a resistance, and a capacitance drawn to the reference temperature for a lumped mass. Not an IEC 60617 claim. |
| Turbine, ideal voltage/current source, damper, fixed mechanical support | Conventional process/circuit/mechanical sketches; no ISO/IEC conformance claim for these forms. |
| Source/sink boundaries, controls, measurements, complex or unclassified models | Explicit functional/model blocks. No invented standard symbol. |
| Pipe and junction | Plain connection line and joined branch with a filled junction dot. |

Electrical ground represents the model's zero-potential reference, not a
protective-earth connection. Mechanical supports have separate hatched geometry.
A battery icon represents the terminal-level battery model, not its internal RC
network. A cylinder icon distinguishes single and double action without inventing
spring return. More complex valve assemblies remain functional blocks until their
full port/state symbol can be verified.

## App mapping and maintenance

`src/schematic/symbols.ts` owns classification, labels, convention metadata,
outline geometry and the separate filled geometry. Both the schematic canvas and
component editor use this mapping. Narrow electrical/mechanical rules precede
general families so a resistor cannot become a motor, a spring cannot become a
capacitor, and a thermal mass cannot become a tank.

The editor supplies exact catalog port names. Reference arrows are used only for
explicit inlet/outlet names; other connections remain undirected. These are port
maps, not physical connection layouts, solved flow directions or construction
drawings. All 312 catalog entries retain an illustration, including explicit
functional-block fallbacks where a symbol has not been verified.

When changing a form, update the shared geometry and its Figma master together,
export the master to its matching SVG filename, and run
`componentPorts.test.tsx`, `schematic/layout.test.ts` and
`schematic/evTopology.test.ts`. Never fill an entire pump/motor outline to obtain
a filled energy triangle.
