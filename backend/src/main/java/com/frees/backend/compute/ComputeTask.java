package com.frees.backend.compute;

/**
 * The message pushed onto the {@code frees.tasks} RabbitMQ queue by the API
 * node (producer) and consumed by the compute node (worker). The original
 * request DTO is carried as a JSON string so the record is trivially
 * serialisable over the wire with a Jackson message converter.
 */
public record ComputeTask(String jobId,
                          String taskType,
                          String sessionId,
                          String requestJson) {

    public static final String QUEUE = "frees.tasks";

    public static final String SOLVE = "SOLVE";
    public static final String SOLVE_TABLE = "SOLVE_TABLE";
    public static final String OPTIMIZE = "OPTIMIZE";
    public static final String OPTIMIZE_MULTI = "OPTIMIZE_MULTI";
    public static final String CURVE_FIT = "CURVE_FIT";
}
