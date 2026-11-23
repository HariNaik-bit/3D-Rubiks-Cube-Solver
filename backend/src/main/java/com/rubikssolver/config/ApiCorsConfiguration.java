package com.rubikssolver.config;

import java.net.URI;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
public class ApiCorsConfiguration implements WebMvcConfigurer {
    private final String[] origins;

    public ApiCorsConfiguration(@Value("${CUBE_ALLOWED_ORIGINS:}") String configuredOrigins) {
        origins = Arrays.stream(configuredOrigins.split(","))
                .map(String::strip)
                .filter(origin -> !origin.isEmpty())
                .map(ApiCorsConfiguration::validateOrigin)
                .distinct()
                .toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (origins.length > 0) {
            registry.addMapping("/api/cube/solve")
                    .allowedOrigins(origins)
                    .allowedMethods("POST")
                    .allowedHeaders("Content-Type")
                    .allowCredentials(false)
                    .maxAge(600);
        }
    }

    private static String validateOrigin(String value) {
        URI origin;
        try {
            origin = URI.create(value);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("CUBE_ALLOWED_ORIGINS must contain valid HTTP(S) origins.");
        }
        if (origin.getScheme() == null || !Set.of("http", "https").contains(origin.getScheme().toLowerCase(Locale.ROOT))
                || origin.getHost() == null || origin.getRawUserInfo() != null
                || !origin.getRawPath().isEmpty() || origin.getRawQuery() != null || origin.getRawFragment() != null) {
            throw new IllegalArgumentException("CUBE_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths.");
        }
        return value;
    }
}
