package com.eventmanager.backend.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;

public final class Requests {
  private Requests() {}

  public record Register(
      @NotBlank @Size(max = 80) String firstName,
      @NotBlank @Size(max = 80) String lastName,
      @NotBlank @Email @Size(max = 254) String email,
      @NotBlank @Size(min = 12, max = 64) String password) {}

  public record Login(
      @NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 64) String password) {}

  public record Profile(
      @NotBlank @Size(max = 80) String firstName, @NotBlank @Size(max = 80) String lastName) {}

  public record Password(
      @NotBlank @Size(max = 64) String currentPassword,
      @NotBlank @Size(min = 12, max = 64) String newPassword) {}

  public record EventInput(
      @NotBlank @Size(max = 120) String title,
      @NotBlank @Size(max = 5000) String description,
      @NotNull @Future Instant startsAt,
      @NotBlank @Size(max = 250) String location,
      @NotBlank String categoryId,
      @Min(1) @Max(1000) int capacity,
      @Min(0) long revision) {}

  public record CategoryInput(@NotBlank @Size(max = 80) String name, boolean active) {}

  public record UserAccess(
      @Pattern(regexp = "USER|ORGANIZER|ADMIN") @NotNull String role, boolean disabled) {}
}
