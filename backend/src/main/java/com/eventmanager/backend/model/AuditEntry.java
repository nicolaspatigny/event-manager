package com.eventmanager.backend.model;

import java.time.Instant;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "audit")
public class AuditEntry {
  @Id private String id;
  private String actorId;
  private String action;
  private String resourceId;

  @Indexed(expireAfter = "90d")
  private Instant createdAt = Instant.now();
}
