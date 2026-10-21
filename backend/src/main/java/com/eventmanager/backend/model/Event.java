package com.eventmanager.backend.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "events")
public class Event {
  @Id private String id;
  private String title;
  private String description;
  @Indexed private Instant startsAt;
  private String location;
  private String categoryId;
  @Indexed private String organizerId;
  private int capacity;
  private String status = "PUBLISHED";
  private List<Registration> registrations = new ArrayList<>();
  private long revision;
  private Instant createdAt = Instant.now();

  public record Registration(String userId, Instant registeredAt) {}
}
