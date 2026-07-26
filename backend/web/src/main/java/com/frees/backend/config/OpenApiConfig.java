package com.frees.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Top-level metadata for the generated OpenAPI document at /api/openapi. */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI freesOpenApi() {
        return new OpenAPI().info(new Info()
                .title("frees API")
                .description("Equation solving, checking, optimization, curve fitting, "
                        + "property plots and the REPL — the same endpoints the web "
                        + "frontend uses. Deployments running the async `api` profile "
                        + "answer POST /api/solve with 202 + a jobId to poll at "
                        + "GET /api/jobs/{jobId}; the default profile answers inline.")
                .version("v1")
                .license(new License().name("MIT")
                        .url("https://github.com/ernsoylu/frees/blob/main/LICENSE")));
    }
}
