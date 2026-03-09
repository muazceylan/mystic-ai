package com.mysticai.numerology.ingestion.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.net.InetAddress;
import java.net.UnknownHostException;

@Service
public class IngestionInstanceIdentityService {

    private final String instanceId;

    public IngestionInstanceIdentityService(
            @Value("${eureka.instance.instance-id:}") String eurekaInstanceId,
            @Value("${spring.application.name:numerology-service}") String appName
    ) {
        if (eurekaInstanceId != null && !eurekaInstanceId.isBlank()) {
            this.instanceId = eurekaInstanceId.trim();
            return;
        }

        String runtimeName = ManagementFactory.getRuntimeMXBean().getName();
        String host = resolveHostName();
        this.instanceId = appName + ":" + host + ":" + runtimeName;
    }

    public String getInstanceId() {
        return instanceId;
    }

    private String resolveHostName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException ex) {
            return "unknown-host";
        }
    }
}
