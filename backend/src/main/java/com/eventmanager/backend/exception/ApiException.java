package com.eventmanager.backend.exception;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
  public final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public static ApiException missing() {
    return new ApiException(HttpStatus.NOT_FOUND, "Ressource introuvable");
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "Accès interdit");
  }

  public static ApiException conflict(String message) {
    return new ApiException(HttpStatus.CONFLICT, message);
  }

  public static ApiException credentials() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Identifiants invalides");
  }
}
