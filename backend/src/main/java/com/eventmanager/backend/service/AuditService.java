package com.eventmanager.backend.service;

import com.eventmanager.backend.model.AuditEntry;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
  private final MongoTemplate mongo;
  private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(AuditService.class);

  public AuditService(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public void record(String actor, String action, String resource) {
    try {
      AuditEntry entry = new AuditEntry();
      entry.setActorId(actor);
      entry.setAction(action);
      entry.setResourceId(resource);
      mongo.insert(entry);
    } catch (org.springframework.dao.DataAccessException e) {
      // A logging outage must not turn a completed business operation into a reported failure.
      LOG.error("Audit persistence unavailable for action {}", action);
    }
  }
}
