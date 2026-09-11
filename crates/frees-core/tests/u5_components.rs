use frees_core::parse_document;

#[test]
fn unified_component_function_lowers_into_component_definitions() {
    let doc = parse_document(
        "function [in, out] = resistor(r)\n\
           port(in)\n\
           port(out)\n\
           out.P = in.P - r * in.mdot\n\
           out.mdot = in.mdot\n\
           connect(in, out)\n\
         end",
    )
    .unwrap();
    assert!(doc.defs.procedures.is_empty());
    let component = &doc.components.defs[0];
    assert_eq!(component.name, "resistor");
    assert_eq!(component.ports, ["in", "out"]);
    assert_eq!(component.params[0].name, "r");
    assert_eq!(component.body.len(), 2);
    assert_eq!(component.sub_connects[0].ports, ["in", "out"]);
}
