package com.frees.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class FreesBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(FreesBackendApplication.class, args);
    }

    /**
     * Cross-origin access is limited to the dev server and the Render
     * deployment by default; override with FREES_CORS_ALLOWED_ORIGINS
     * (comma-separated origin patterns) for other deployments. The Docker
     * frontend reaches the API same-origin through the nginx proxy.
     */
    @Bean
    public WebMvcConfigurer corsConfigurer(
            @Value("${frees.cors.allowed-origins:http://localhost:5173,https://*.onrender.com}")
            String allowedOrigins) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOriginPatterns(allowedOrigins.split(","))
                        .allowedMethods("GET", "POST");
            }
        };
    }
}
