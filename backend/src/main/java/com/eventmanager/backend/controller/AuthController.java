package com.eventmanager.backend.controller;

import com.eventmanager.backend.dto.*;
import com.eventmanager.backend.model.User;
import com.eventmanager.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final UserService users;

  public AuthController(UserService users) {
    this.users = users;
  }

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public UserResponse register(@Valid @RequestBody Requests.Register input) {
    return users.view(users.register(input));
  }

  @PostMapping("/auth/login")
  public LoginResponse login(@Valid @RequestBody Requests.Login input) {
    return users.login(input);
  }

  @PostMapping("/auth/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@AuthenticationPrincipal User user) {
    users.revoke(user);
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal User user) {
    return users.view(user);
  }

  @PutMapping("/me")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void profile(
      @AuthenticationPrincipal User user, @Valid @RequestBody Requests.Profile input) {
    users.profile(user, input);
  }

  @PutMapping("/me/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void password(
      @AuthenticationPrincipal User user, @Valid @RequestBody Requests.Password input) {
    users.password(user, input);
  }
}
