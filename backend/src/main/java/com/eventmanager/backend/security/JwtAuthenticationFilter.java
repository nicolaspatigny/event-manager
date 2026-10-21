package com.eventmanager.backend.security;

import com.eventmanager.backend.repository.UserRepository;
import com.eventmanager.backend.service.JwtService;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwt;
  private final UserRepository users;

  public JwtAuthenticationFilter(JwtService jwt, UserRepository users) {
    this.jwt = jwt;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        var claims = jwt.parse(header.substring(7));
        var user = users.findById(claims.getSubject()).orElse(null);
        Number version = claims.get("version", Number.class);
        if (user != null
            && !user.isDisabled()
            && version != null
            && version.longValue() == user.getTokenVersion()) {
          SecurityContextHolder.getContext()
              .setAuthentication(
                  new UsernamePasswordAuthenticationToken(
                      user, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole()))));
        }
      } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
        SecurityContextHolder.clearContext();
      }
    }
    chain.doFilter(request, response);
  }
}
