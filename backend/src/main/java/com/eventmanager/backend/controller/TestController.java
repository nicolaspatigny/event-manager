package com.eventmanager.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping
    public String test() {
        return "JWT authentication works!";
    }

    @GetMapping("/user")
    @PreAuthorize("hasRole('USER')")
    public String userTest() {
        return "USER access works!";
    }

    @GetMapping("/organizer")
    @PreAuthorize("hasRole('ORGANIZER')")
    public String organizerTest() {
        return "ORGANIZER access works!";
    }
}