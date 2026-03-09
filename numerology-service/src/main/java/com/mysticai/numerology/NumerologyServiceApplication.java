package com.mysticai.numerology;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NumerologyServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NumerologyServiceApplication.class, args);
    }
}
