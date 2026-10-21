package com.eventmanager.backend.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "categories")
public class Category {
  @Id private String id;
  private String name;

  @Indexed(unique = true)
  private String normalizedName;

  private boolean active = true;
}
