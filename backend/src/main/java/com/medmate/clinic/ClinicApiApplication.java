package com.medmate.clinic;

import com.medmate.clinic.config.TenancyConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(TenancyConfig.class)
public class ClinicApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(ClinicApiApplication.class, args);
    }
}
