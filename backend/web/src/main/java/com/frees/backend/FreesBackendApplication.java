package com.frees.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Scheduling powers the MeasurementStore TTL sweep (Data Analyzer Phase 3).
@EnableScheduling
@SpringBootApplication
public class FreesBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FreesBackendApplication.class, args);
    }

    /**
     * Cross-origin access, disabled by default because no shipped deployment
     * needs it: the Docker and Railway frontends reach the API same-origin
     * through the nginx {@code /api} proxy, and {@code npm start} is same-origin
     * too because the Vite dev server proxies {@code /api} to :8080 (see
     * {@code vite.config.ts}).
     *
     * <p>The former default allowed {@code https://*.up.railway.app} — every
     * app on Railway's shared apex, i.e. anyone with a free account. With no
     * credentials involved that is not session theft, but it did let an
     * attacker-controlled page drive this API from its visitors' browsers,
     * spreading solve/check load across many residential IPs and defeating
     * per-client rate limiting by construction. A wildcard over a shared
     * hosting domain is not a meaningful origin restriction.
     *
     * <p>Set {@code FREES_CORS_ALLOWED_ORIGINS} (comma-separated) only for a
     * deployment that genuinely serves the frontend from a different origin,
     * and list exact origins rather than a wildcard over a shared domain.
     */
    @Bean
    public WebMvcConfigurer corsConfigurer(
            @Value("${frees.cors.allowed-origins:}") String allowedOrigins) {
        String[] origins = allowedOrigins == null || allowedOrigins.isBlank()
                ? new String[0]
                : allowedOrigins.split(",");
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                if (origins.length == 0) {
                    return; // same-origin only
                }
                registry.addMapping("/api/**")
                        .allowedOriginPatterns(origins)
                        .allowedMethods("GET", "POST");
            }
        };
    }
}
