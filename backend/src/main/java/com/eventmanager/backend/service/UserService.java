package com.eventmanager.backend.service;

import com.eventmanager.backend.dto.RegisterRequest;
import com.eventmanager.backend.model.User;
import com.eventmanager.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(RegisterRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();

        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());

        // Never store the password in plain text
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Default role for newly registered users
        user.setRole("USER");

        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }
}