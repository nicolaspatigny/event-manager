package com.eventmanager.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
    properties = {
      "jwt.secret=context-test-key-only-at-least-32-bytes-long",
      "spring.mongodb.uri=mongodb://127.0.0.1:27017/event_manager_context_test"
    })
class BackendApplicationTests {
  @Test
  void contextLoads() {}
}
