package com.eventmanager.backend.controller;

import com.eventmanager.backend.dto.*;
import com.eventmanager.backend.model.*;
import com.eventmanager.backend.service.AdministrationService;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AdminController {
  private final AdministrationService service;

  public AdminController(AdministrationService service) {
    this.service = service;
  }

  @GetMapping("/categories")
  public List<Category> categories() {
    return service.categories();
  }

  @PostMapping("/admin/categories")
  @ResponseStatus(HttpStatus.CREATED)
  public Category createCategory(
      @Valid @RequestBody Requests.CategoryInput input, @AuthenticationPrincipal User actor) {
    return service.createCategory(input, actor);
  }

  @PutMapping("/admin/categories/{id}")
  public Category updateCategory(
      @PathVariable String id,
      @Valid @RequestBody Requests.CategoryInput input,
      @AuthenticationPrincipal User actor) {
    return service.updateCategory(id, input, actor);
  }

  @GetMapping("/admin/users")
  public Views.Page<User> users(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return service.users(page, size);
  }

  @PutMapping("/admin/users/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void access(
      @PathVariable String id,
      @Valid @RequestBody Requests.UserAccess input,
      @AuthenticationPrincipal User actor) {
    service.access(id, input, actor);
  }

  @GetMapping("/admin/audit")
  public Views.Page<AuditEntry> audit(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return service.audit(page, size);
  }

  @GetMapping("/dashboard")
  public Map<String, Long> dashboard(@AuthenticationPrincipal User actor) {
    return service.dashboard(actor);
  }

  @GetMapping("/me/export")
  public Map<String, Object> export(@AuthenticationPrincipal User actor) {
    return service.export(actor);
  }

  @DeleteMapping("/me")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@AuthenticationPrincipal User actor) {
    service.delete(actor);
  }
}
