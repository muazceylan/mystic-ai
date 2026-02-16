package com.mysticai.vision;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Vision Service - Mystic AI Görsel Analiz Servisi
 * 
 * Bu servis kahve falı ve el falı fotoğraflarını analiz eder.
 * Spring AI'ın çok modüllü (multi-modal) model desteği ile
 * görüntüleri mistik bir dille yorumlar.
 * 
 * Port: 8089
 */
@SpringBootApplication
@EnableDiscoveryClient
public class VisionServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(VisionServiceApplication.class, args);
    }
}
