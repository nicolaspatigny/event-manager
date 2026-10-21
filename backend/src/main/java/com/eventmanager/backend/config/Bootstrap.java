package com.eventmanager.backend.config;

import com.eventmanager.backend.model.*;
import com.eventmanager.backend.repository.UserRepository;
import com.eventmanager.backend.service.UserService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class Bootstrap {
  @Bean
  ApplicationRunner initializeAdministrator(
      UserRepository users, PasswordEncoder encoder, MongoTemplate mongo, Environment env) {
    return args -> {
      String email = env.getProperty("ADMIN_EMAIL", "");
      String password = env.getProperty("ADMIN_PASSWORD", "");
      if (!email.isBlank()
          && !password.isBlank()
          && users.findByEmail(UserService.email(email)).isEmpty()) {
        if (password.length() < 12
            || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
          throw new IllegalStateException(
              "ADMIN_PASSWORD must be 12 characters minimum and 72 UTF-8 bytes maximum");
        User admin = new User();
        admin.setEmail(UserService.email(email));
        admin.setFirstName("Administration");
        admin.setLastName("Event Manager");
        admin.setRole("ADMIN");
        admin.setPassword(encoder.encode(password));
        users.insert(admin);
      }
    };
  }
}
