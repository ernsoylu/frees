package com.frees.backend.ast;

import java.util.List;
import java.util.Map;

/**
 * A plot declared in the editor text with a PLOT 'name' ... END block. Like a
 * {@link ParametricTable}, it never enters the equation system: it only
 * describes a graph the frontend renders (xy / property / psychro) in the
 * dedicated Plots tab.
 *
 * <p>Attributes are kept as a raw {@code key -> values} map (keys lowercased,
 * values normalized to their string form: unquoted string content, number
 * text, or a variable/array base name). The frontend maps them onto its
 * PlotSpec, so the backend stays decoupled from the plot presentation model.
 */
public record PlotDef(String name, Map<String, List<String>> attributes) {}
