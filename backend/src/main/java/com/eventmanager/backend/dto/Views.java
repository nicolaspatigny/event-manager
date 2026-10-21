package com.eventmanager.backend.dto;

import com.eventmanager.backend.model.*;
import java.time.Instant;
import java.util.List;

public final class Views {
  private Views() {}

  public record EventView(
      String id,
      String title,
      String description,
      Instant startsAt,
      String location,
      String categoryId,
      String organizerId,
      int capacity,
      String status,
      int registeredCount,
      int availablePlaces,
      boolean registered,
      long revision) {}

  public static EventView event(Event e, String userId) {
    return new EventView(
        e.getId(),
        e.getTitle(),
        e.getDescription(),
        e.getStartsAt(),
        e.getLocation(),
        e.getCategoryId(),
        e.getOrganizerId(),
        e.getCapacity(),
        e.getStatus(),
        e.getRegistrations().size(),
        Math.max(0, e.getCapacity() - e.getRegistrations().size()),
        e.getRegistrations().stream().anyMatch(r -> r.userId().equals(userId)),
        e.getRevision());
  }

  public record Page<T>(List<T> items, long total, int page, int size) {}
}
