use frees_core::{parse_document, solve, SolverSettings};

#[test]
fn unified_component_function_lowers_into_component_definitions() {
    let doc = parse_document(
        "function [in, out] = resistor(r=2)\n\
           port(in)\n\
           port(out)\n\
           out.P = in.P - r * in.mdot\n\
           out.mdot = in.mdot\n\
           variant nominal require(r)\n\
           out.P = in.P - r * in.mdot\n\
           end\n\
           connect(in, out)\n\
         end",
    )
    .unwrap();
    assert!(doc.defs.procedures.is_empty());
    let component = &doc.components.defs[0];
    assert_eq!(component.name, "resistor");
    assert_eq!(component.ports, ["in", "out"]);
    assert_eq!(component.params[0].name, "r");
    assert!(component.params[0].default_value.is_some());
    assert_eq!(component.variants[0].name, "nominal");
    assert_eq!(component.variants[0].require, ["r"]);
    assert_eq!(component.body.len(), 2);
    assert_eq!(component.sub_connects[0].ports, ["in", "out"]);
}

#[test]
fn unified_component_definition_expands_in_an_instance() {
    let solution = solve(
        "function [in, out] = resistor(r=2)\n\
           port(in)\n\
           port(out)\n\
           out.P = in.P - r * in.mdot\n\
           out.mdot = in.mdot\n\
           connect(in, out)\n\
         end\n\
         resistor R(s1, s2)\n\
         s1.P = 10\n\
         s1.mdot = 1",
        &SolverSettings::default(),
    )
    .unwrap();
    assert_eq!(
        solution.values.get("s2$p"),
        Some(&8.0),
        "{:?}",
        solution.values
    );
}
