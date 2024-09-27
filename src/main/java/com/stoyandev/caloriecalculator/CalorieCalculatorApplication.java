package com.stoyandev.caloriecalculator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

@SpringBootApplication
@EnableWebSecurity
@EnableMethodSecurity
public class CalorieCalculatorApplication {

    public static void main(String[] args) {
        SpringApplication.run(CalorieCalculatorApplication.class, args);
    }

}
