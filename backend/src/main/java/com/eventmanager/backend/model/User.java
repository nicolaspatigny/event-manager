package com.eventmanager.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "users")
public class User {
  @Id private String id;
  private String firstName;
  private String lastName;

  @Indexed(unique = true)
  private String email;

  @lombok.ToString.Exclude @JsonIgnore private String password;
  private String role = "USER";
  private LocalDateTime createdAt = LocalDateTime.now();
  private boolean disabled;
  @JsonIgnore private long tokenVersion;
}
