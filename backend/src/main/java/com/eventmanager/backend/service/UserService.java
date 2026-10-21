package com.eventmanager.backend.service;

import com.eventmanager.backend.dto.*;
import com.eventmanager.backend.exception.ApiException;
import com.eventmanager.backend.model.User;
import com.eventmanager.backend.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {
  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;
  private final MongoTemplate mongo;
  private final AuditService audit;
  private final String dummyHash;

  public UserService(
      UserRepository users,
      PasswordEncoder encoder,
      JwtService jwt,
      MongoTemplate mongo,
      AuditService audit) {
    this.users = users;
    this.encoder = encoder;
    this.jwt = jwt;
    this.mongo = mongo;
    this.audit = audit;
    this.dummyHash = encoder.encode(java.util.UUID.randomUUID().toString());
  }

  public static String email(String value) {
    return value.strip().toLowerCase(Locale.ROOT);
  }

  public User register(Requests.Register input) {
    checkPassword(input.password());
    User user = new User();
    user.setFirstName(input.firstName().strip());
    user.setLastName(input.lastName().strip());
    user.setEmail(email(input.email()));
    user.setPassword(encoder.encode(input.password()));
    users.insert(user);
    audit.record(user.getId(), "ACCOUNT_CREATED", user.getId());
    return user;
  }

  public LoginResponse login(Requests.Login input) {
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72)
      throw ApiException.credentials();
    User user = users.findByEmail(email(input.email())).orElse(null);
    boolean matches =
        encoder.matches(input.password(), user == null ? dummyHash : user.getPassword());
    if (user == null || !matches || user.isDisabled()) {
      audit.record(null, "LOGIN_FAILED", null);
      throw ApiException.credentials();
    }
    audit.record(user.getId(), "LOGIN", user.getId());
    return new LoginResponse(jwt.generateToken(user), view(user));
  }

  public UserResponse view(User u) {
    return new UserResponse(
        u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getRole(), u.getCreatedAt());
  }

  public void revoke(User user) {
    mongo.updateFirst(
        Query.query(Criteria.where("id").is(user.getId())),
        new Update().inc("tokenVersion", 1),
        User.class);
  }

  public void profile(User user, Requests.Profile input) {
    mongo.updateFirst(
        Query.query(Criteria.where("id").is(user.getId())),
        new Update()
            .set("firstName", input.firstName().strip())
            .set("lastName", input.lastName().strip()),
        User.class);
    audit.record(user.getId(), "PROFILE_UPDATED", user.getId());
  }

  public void password(User user, Requests.Password input) {
    if (!encoder.matches(input.currentPassword(), user.getPassword()))
      throw ApiException.credentials();
    checkPassword(input.newPassword());
    mongo.updateFirst(
        Query.query(Criteria.where("id").is(user.getId())),
        new Update().set("password", encoder.encode(input.newPassword())).inc("tokenVersion", 1),
        User.class);
    audit.record(user.getId(), "PASSWORD_CHANGED", user.getId());
  }

  private void checkPassword(String password) {
    if (password.getBytes(StandardCharsets.UTF_8).length > 72)
      throw new ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST, "Mot de passe limité à 72 octets UTF-8");
  }
}
