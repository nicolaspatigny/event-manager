package com.eventmanager.backend.controller;

import java.util.Map;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  private final MongoTemplate mongo;
  private final ApplicationAvailability availability;

  public HealthController(MongoTemplate mongo, ApplicationAvailability availability) {
    this.mongo = mongo;
    this.availability = availability;
  }

  @GetMapping("/api/health")
  public ResponseEntity<Map<String, String>> health() {
    try {
      if (availability.getReadinessState() != ReadinessState.ACCEPTING_TRAFFIC) {
        return ResponseEntity.status(503).body(Map.of("status", "STARTING"));
      }
      mongo.executeCommand("{ping:1}");
      return ResponseEntity.ok(Map.of("status", "UP"));
    } catch (org.springframework.dao.DataAccessException exception) {
      return ResponseEntity.status(503).body(Map.of("status", "DOWN"));
    }
  }
}
