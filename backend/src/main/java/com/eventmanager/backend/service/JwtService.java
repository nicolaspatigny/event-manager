package com.eventmanager.backend.service;

import com.eventmanager.backend.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final SecretKey key;
  private final long expiration;

  public JwtService(
      @Value("${jwt.secret}") String secret, @Value("${jwt.expiration:3600000}") long expiration) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expiration = expiration;
  }

  public String generateToken(User user) {
    Date now = new Date();
    return Jwts.builder()
        .issuer("event-manager")
        .subject(user.getId())
        .claim("version", user.getTokenVersion())
        .issuedAt(now)
        .expiration(new Date(now.getTime() + expiration))
        .signWith(key)
        .compact();
  }

  public Claims parse(String token) {
    return Jwts.parser()
        .requireIssuer("event-manager")
        .verifyWith(key)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
