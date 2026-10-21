package com.eventmanager.backend;

import static org.junit.jupiter.api.Assertions.*;

import com.eventmanager.backend.model.*;
import com.eventmanager.backend.repository.UserRepository;
import com.eventmanager.backend.service.JwtService;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import tools.jackson.databind.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PlatformIntegrationTests {
  static final String DATABASE = "platform_test_" + UUID.randomUUID().toString().replace("-", "");
  static MongoTemplate testDatabase;

  @DynamicPropertySource
  static void config(DynamicPropertyRegistry registry) {
    registry.add("spring.mongodb.uri", () -> "mongodb://127.0.0.1:27017/" + DATABASE);
    registry.add("jwt.secret", () -> "test-only-signing-key-not-for-production-1234567890");
  }

  @Autowired MongoTemplate mongo;
  @Autowired UserRepository users;
  @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt;
  @LocalServerPort int port;
  final HttpClient client = HttpClient.newHttpClient();
  final ObjectMapper json = new ObjectMapper();

  @BeforeEach
  void clear() {
    testDatabase = mongo;
    mongo.remove(new Query(), Event.class);
    mongo.remove(new Query(), User.class);
    mongo.remove(new Query(), Category.class);
    mongo.remove(new Query(), AuditEntry.class);
  }

  @AfterAll
  static void cleanup() {
    if (testDatabase != null) testDatabase.getDb().drop();
  }

  record Actor(User user, String token) {}

  Actor actor(String role) {
    User u = new User();
    u.setId(UUID.randomUUID().toString());
    u.setFirstName("Test");
    u.setLastName(role);
    u.setEmail(u.getId() + "@example.test");
    u.setRole(role);
    u.setPassword(encoder.encode("test-password-123"));
    users.insert(u);
    return new Actor(u, jwt.generateToken(u));
  }

  HttpResponse<String> request(String method, String path, Object body, String token)
      throws Exception {
    HttpRequest.Builder builder =
        HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
            .header("Content-Type", "application/json");
    if (token != null) builder.header("Authorization", "Bearer " + token);
    builder.method(
        method,
        body == null
            ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
    return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
  }

  JsonNode read(HttpResponse<String> r) {
    return json.readTree(r.body());
  }

  String category(Actor admin) throws Exception {
    var r =
        request(
            "POST", "/admin/categories", Map.of("name", "Culture", "active", true), admin.token);
    assertEquals(201, r.statusCode(), r.body());
    return read(r).get("id").asString();
  }

  Map<String, Object> eventInput(String category, int capacity, long revision) {
    return Map.of(
        "title",
        "Rencontre de test",
        "description",
        "Une rencontre pour les tests",
        "startsAt",
        Instant.now().plusSeconds(86400).toString(),
        "location",
        "Nantes",
        "categoryId",
        category,
        "capacity",
        capacity,
        "revision",
        revision);
  }

  String event(Actor organizer, String category, int capacity) throws Exception {
    var r = request("POST", "/events", eventInput(category, capacity, 0), organizer.token);
    assertEquals(201, r.statusCode(), r.body());
    return read(r).get("id").asString();
  }

  @Test
  void healthChecksApplicationReadinessAndMongoDB() throws Exception {
    assertEquals(200, request("GET", "/health", null, null).statusCode());
  }

  @Test
  void expiredAndTamperedTokensAreRejected() throws Exception {
    Actor user = actor("USER");
    String expired =
        io.jsonwebtoken.Jwts.builder()
            .issuer("event-manager")
            .subject(user.user.getId())
            .claim("version", 0)
            .issuedAt(Date.from(Instant.now().minusSeconds(7200)))
            .expiration(Date.from(Instant.now().minusSeconds(3600)))
            .signWith(
                io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                    "test-only-signing-key-not-for-production-1234567890"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8)))
            .compact();
    assertEquals(401, request("GET", "/me", null, expired).statusCode());
    int signature = user.token.lastIndexOf('.') + 1;
    String changed =
        user.token.substring(0, signature)
            + (user.token.charAt(signature) == 'A' ? "B" : "A")
            + user.token.substring(signature + 1);
    assertEquals(401, request("GET", "/me", null, changed).statusCode());
  }

  @Test
  void authenticationValidationAndEmailUniqueness() throws Exception {
    var input =
        Map.of(
            "firstName",
            "Alice",
            "lastName",
            "Test",
            "email",
            "Alice@Example.test",
            "password",
            "test-password-123",
            "role",
            "ADMIN");
    var r = request("POST", "/auth/register", input, null);
    assertEquals(201, r.statusCode(), r.body());
    assertEquals("USER", read(r).get("role").asString());
    assertFalse(read(r).has("password"));
    User stored = users.findByEmail("alice@example.test").orElseThrow();
    assertTrue(encoder.matches("test-password-123", stored.getPassword()));
    assertNotEquals("test-password-123", stored.getPassword());
    assertEquals(409, request("POST", "/auth/register", input, null).statusCode());
    User duplicate = new User();
    duplicate.setEmail(stored.getEmail());
    assertThrows(
        org.springframework.dao.DuplicateKeyException.class, () -> users.insert(duplicate));
    var invalid =
        request(
            "POST",
            "/auth/register",
            Map.of("firstName", "", "lastName", "Test", "email", "bad", "password", "short"),
            null);
    assertEquals(400, invalid.statusCode());
    assertTrue(read(invalid).get("errors").has("password"));
    var login =
        request(
            "POST",
            "/auth/login",
            Map.of("email", "ALICE@example.test", "password", "test-password-123"),
            null);
    assertEquals(200, login.statusCode(), login.body());
    assertTrue(login.headers().allValues("set-cookie").isEmpty());
    String token = read(login).get("token").asString();
    assertEquals(200, request("GET", "/me", null, token).statusCode());
    var wrong =
        request(
            "POST",
            "/auth/login",
            Map.of("email", "alice@example.test", "password", "wrong"),
            null);
    var missing =
        request(
            "POST",
            "/auth/login",
            Map.of("email", "missing@example.test", "password", "wrong"),
            null);
    assertEquals(401, wrong.statusCode());
    assertEquals(read(wrong).get("detail"), read(missing).get("detail"));
  }

  @Test
  void anonymousAndInsufficientRolesAreRejected() throws Exception {
    Actor participant = actor("USER");
    assertEquals(401, request("GET", "/me", null, null).statusCode());
    assertEquals(401, request("GET", "/me", null, "bad-token").statusCode());
    assertEquals(403, request("GET", "/admin/users", null, participant.token).statusCode());
    assertEquals(403, request("GET", "/events?scope=admin", null, participant.token).statusCode());
    assertEquals(
        403,
        request(
                "POST",
                "/admin/categories",
                Map.of("name", "Fake", "active", true),
                participant.token)
            .statusCode());
    assertEquals(200, request("GET", "/events", null, null).statusCode());
    assertEquals(200, request("GET", "/categories", null, null).statusCode());
  }

  @Test
  void logoutAndPasswordChangeRevokeTokens() throws Exception {
    Actor user = actor("USER");
    assertEquals(204, request("POST", "/auth/logout", null, user.token).statusCode());
    assertEquals(401, request("GET", "/me", null, user.token).statusCode());
    var login =
        request(
            "POST",
            "/auth/login",
            Map.of("email", user.user.getEmail(), "password", "test-password-123"),
            null);
    String token = read(login).get("token").asString();
    assertEquals(
        204,
        request(
                "PUT",
                "/me/password",
                Map.of("currentPassword", "test-password-123", "newPassword", "new-password-123"),
                token)
            .statusCode());
    assertEquals(401, request("GET", "/me", null, token).statusCode());
    assertEquals(
        401,
        request(
                "POST",
                "/auth/login",
                Map.of("email", user.user.getEmail(), "password", "test-password-123"),
                null)
            .statusCode());
    assertEquals(
        200,
        request(
                "POST",
                "/auth/login",
                Map.of("email", user.user.getEmail(), "password", "new-password-123"),
                null)
            .statusCode());
  }

  @Test
  void eventOwnershipValidationAndOptimisticConcurrency() throws Exception {
    Actor admin = actor("ADMIN"),
        organizer = actor("ORGANIZER"),
        other = actor("ORGANIZER"),
        participant = actor("USER");
    String c = category(admin);
    String id = event(organizer, c, 3);
    assertEquals(
        403, request("PUT", "/events/" + id, eventInput(c, 3, 0), other.token).statusCode());
    assertEquals(403, request("DELETE", "/events/" + id, null, other.token).statusCode());
    assertEquals(
        403, request("GET", "/events/" + id + "/participants", null, other.token).statusCode());
    assertEquals(
        403, request("POST", "/events", eventInput(c, 3, 0), participant.token).statusCode());
    var past = new HashMap<>(eventInput(c, 3, 0));
    past.put("startsAt", Instant.now().minusSeconds(60).toString());
    assertEquals(400, request("POST", "/events", past, organizer.token).statusCode());
    assertEquals(
        200, request("PUT", "/events/" + id, eventInput(c, 4, 0), organizer.token).statusCode());
    assertEquals(
        409, request("PUT", "/events/" + id, eventInput(c, 3, 0), organizer.token).statusCode());
    assertEquals(404, request("GET", "/events/not-found", null, null).statusCode());
  }

  @Test
  void registrationCapacityDuplicatesCancellationAndHistory() throws Exception {
    Actor admin = actor("ADMIN"),
        organizer = actor("ORGANIZER"),
        one = actor("USER"),
        two = actor("USER");
    String c = category(admin);
    String id = event(organizer, c, 1);
    assertEquals(
        201, request("POST", "/events/" + id + "/registrations", null, one.token).statusCode());
    assertEquals(
        409, request("POST", "/events/" + id + "/registrations", null, one.token).statusCode());
    assertEquals(
        409, request("POST", "/events/" + id + "/registrations", null, two.token).statusCode());
    assertEquals(
        403,
        request("POST", "/events/" + id + "/registrations", null, organizer.token).statusCode());
    var detail = read(request("GET", "/events/" + id, null, null));
    assertFalse(detail.has("registrations"));
    assertFalse(detail.toString().contains(one.user.getEmail()));
    assertEquals(
        1,
        read(request("GET", "/events?scope=registrations", null, one.token)).get("total").asInt());
    assertEquals(
        1, read(request("GET", "/events/" + id + "/participants", null, organizer.token)).size());
    assertEquals(
        204,
        request("DELETE", "/events/" + id + "/registrations/me", null, one.token).statusCode());
    assertEquals(
        201, request("POST", "/events/" + id + "/registrations", null, two.token).statusCode());
    assertEquals(204, request("DELETE", "/events/" + id, null, organizer.token).statusCode());
    assertEquals(
        409, request("POST", "/events/" + id + "/registrations", null, one.token).statusCode());
    assertEquals(0, read(request("GET", "/events", null, null)).get("total").asInt());
  }

  @Test
  void simultaneousRegistrationsNeverOversell() throws Exception {
    Actor admin = actor("ADMIN"), organizer = actor("ORGANIZER");
    String id = event(organizer, category(admin), 3);
    List<Actor> participants = new ArrayList<>();
    for (int i = 0; i < 12; i++) participants.add(actor("USER"));
    try (var pool = Executors.newFixedThreadPool(12)) {
      List<Future<Integer>> results = new ArrayList<>();
      for (Actor a : participants)
        results.add(
            pool.submit(
                () ->
                    request("POST", "/events/" + id + "/registrations", null, a.token)
                        .statusCode()));
      int accepted = 0;
      for (var result : results) {
        int status = result.get(30, TimeUnit.SECONDS);
        assertTrue(status == 201 || status == 409, "Unexpected status " + status);
        if (status == 201) accepted++;
      }
      assertEquals(3, accepted);
    }
    assertEquals(3, mongo.findById(id, Event.class).getRegistrations().size());
  }

  @Test
  void simultaneousDuplicateRegistrationIsAtomic() throws Exception {
    Actor admin = actor("ADMIN"), organizer = actor("ORGANIZER"), user = actor("USER");
    String id = event(organizer, category(admin), 10);
    try (var pool = Executors.newFixedThreadPool(6)) {
      List<Future<Integer>> results = new ArrayList<>();
      for (int i = 0; i < 6; i++)
        results.add(
            pool.submit(
                () ->
                    request("POST", "/events/" + id + "/registrations", null, user.token)
                        .statusCode()));
      int accepted = 0;
      for (var result : results) if (result.get(30, TimeUnit.SECONDS) == 201) accepted++;
      assertEquals(1, accepted);
    }
    assertEquals(1, mongo.findById(id, Event.class).getRegistrations().size());
  }

  @Test
  void capacityCannotBeReducedBelowRegistrationsAndPastEventsRejectRegistration() throws Exception {
    Actor admin = actor("ADMIN"),
        organizer = actor("ORGANIZER"),
        one = actor("USER"),
        two = actor("USER");
    String c = category(admin), id = event(organizer, c, 3);
    request("POST", "/events/" + id + "/registrations", null, one.token);
    request("POST", "/events/" + id + "/registrations", null, two.token);
    assertEquals(
        409, request("PUT", "/events/" + id, eventInput(c, 1, 2), organizer.token).statusCode());
    mongo.updateFirst(
        Query.query(Criteria.where("id").is(id)),
        new Update().set("startsAt", Instant.now().minusSeconds(60)),
        Event.class);
    Actor third = actor("USER");
    assertEquals(
        409, request("POST", "/events/" + id + "/registrations", null, third.token).statusCode());
    assertEquals(
        409,
        request("DELETE", "/events/" + id + "/registrations/me", null, one.token).statusCode());
    assertEquals(
        1,
        read(request("GET", "/events?scope=registrations", null, one.token)).get("total").asInt());
  }

  @Test
  void adminRoleChangesAndDisabledAccountsInvalidateExistingTokens() throws Exception {
    Actor admin = actor("ADMIN"), user = actor("USER");
    assertEquals(
        204,
        request(
                "PUT",
                "/admin/users/" + user.user.getId(),
                Map.of("role", "ORGANIZER", "disabled", false),
                admin.token)
            .statusCode());
    assertEquals(401, request("GET", "/me", null, user.token).statusCode());
    var login =
        request(
            "POST",
            "/auth/login",
            Map.of("email", user.user.getEmail(), "password", "test-password-123"),
            null);
    assertEquals("ORGANIZER", read(login).get("user").get("role").asString());
    String token = read(login).get("token").asString();
    request(
        "PUT",
        "/admin/users/" + user.user.getId(),
        Map.of("role", "ORGANIZER", "disabled", true),
        admin.token);
    assertEquals(401, request("GET", "/me", null, token).statusCode());
    assertEquals(
        401,
        request(
                "POST",
                "/auth/login",
                Map.of("email", user.user.getEmail(), "password", "test-password-123"),
                null)
            .statusCode());
    assertEquals(
        409,
        request(
                "PUT",
                "/admin/users/" + admin.user.getId(),
                Map.of("role", "USER", "disabled", true),
                admin.token)
            .statusCode());
  }

  @Test
  void categoriesSearchPaginationAndAudit() throws Exception {
    Actor admin = actor("ADMIN"), organizer = actor("ORGANIZER");
    String c = category(admin);
    event(organizer, c, 4);
    assertEquals(
        409,
        request("POST", "/admin/categories", Map.of("name", "CULTURE", "active", true), admin.token)
            .statusCode());
    assertEquals(
        1,
        read(request("GET", "/events?q=Rencontre&location=Nantes&category=" + c, null, null))
            .get("total")
            .asInt());
    assertEquals(
        0, read(request("GET", "/events?q=%5B%2E%2A%5D", null, null)).get("total").asInt());
    assertEquals(400, request("GET", "/events?size=1000", null, null).statusCode());
    assertEquals(
        200,
        request(
                "PUT",
                "/admin/categories/" + c,
                Map.of("name", "Culture", "active", false),
                admin.token)
            .statusCode());
    assertEquals(
        409, request("POST", "/events", eventInput(c, 3, 0), organizer.token).statusCode());
    assertTrue(read(request("GET", "/admin/audit", null, admin.token)).get("total").asInt() > 0);
    String logs = request("GET", "/admin/audit", null, admin.token).body();
    assertFalse(logs.contains("test-password"));
    assertFalse(logs.contains(admin.token));
  }

  @Test
  void profileExportAndErasure() throws Exception {
    Actor admin = actor("ADMIN"), organizer = actor("ORGANIZER"), user = actor("USER");
    String id = event(organizer, category(admin), 3);
    request("POST", "/events/" + id + "/registrations", null, user.token);
    assertEquals(
        204,
        request("PUT", "/me", Map.of("firstName", "Updated", "lastName", "Name"), user.token)
            .statusCode());
    var exported = request("GET", "/me/export", null, user.token);
    assertEquals(200, exported.statusCode());
    assertFalse(exported.body().contains("password"));
    assertEquals("Updated", read(exported).get("profile").get("firstName").asString());
    assertEquals(409, request("DELETE", "/me", null, organizer.token).statusCode());
    assertEquals(204, request("DELETE", "/me", null, user.token).statusCode());
    assertTrue(users.findById(user.user.getId()).isEmpty());
    assertEquals(0, mongo.findById(id, Event.class).getRegistrations().size());
    assertEquals(401, request("GET", "/me", null, user.token).statusCode());
    assertEquals(
        0,
        mongo.count(
            Query.query(Criteria.where("actorId").is(user.user.getId())), AuditEntry.class));
  }
}
