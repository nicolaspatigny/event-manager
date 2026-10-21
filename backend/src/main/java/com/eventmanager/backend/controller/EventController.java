package com.eventmanager.backend.controller;

import com.eventmanager.backend.dto.*;
import com.eventmanager.backend.model.User;
import com.eventmanager.backend.service.EventService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
public class EventController {
  private final EventService events;

  public EventController(EventService events) {
    this.events = events;
  }

  @GetMapping
  public Views.Page<Views.EventView> list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String category,
      @RequestParam(defaultValue = "") String location,
      @RequestParam(required = false) Instant from,
      @RequestParam(required = false) Instant to,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "12") int size,
      @RequestParam(defaultValue = "public") String scope,
      @AuthenticationPrincipal User actor) {
    return events.search(q, category, location, from, to, page, size, scope, actor);
  }

  @GetMapping("/{id}")
  public Views.EventView detail(@PathVariable String id, @AuthenticationPrincipal User actor) {
    return events.detail(id, actor);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Views.EventView create(
      @Valid @RequestBody Requests.EventInput input, @AuthenticationPrincipal User actor) {
    return Views.event(events.create(input, actor), actor.getId());
  }

  @PutMapping("/{id}")
  public Views.EventView update(
      @PathVariable String id,
      @Valid @RequestBody Requests.EventInput input,
      @AuthenticationPrincipal User actor) {
    return Views.event(events.update(id, input, actor), actor.getId());
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void cancel(@PathVariable String id, @AuthenticationPrincipal User actor) {
    events.cancel(id, actor);
  }

  @PostMapping("/{id}/registrations")
  @ResponseStatus(HttpStatus.CREATED)
  public Views.EventView register(@PathVariable String id, @AuthenticationPrincipal User actor) {
    return Views.event(events.register(id, actor), actor.getId());
  }

  @DeleteMapping("/{id}/registrations/me")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void unregister(@PathVariable String id, @AuthenticationPrincipal User actor) {
    events.unregister(id, actor);
  }

  @GetMapping("/{id}/participants")
  @PreAuthorize("hasAnyRole('ORGANIZER','ADMIN')")
  public List<Map<String, Object>> participants(
      @PathVariable String id, @AuthenticationPrincipal User actor) {
    return events.participants(id, actor);
  }
}
