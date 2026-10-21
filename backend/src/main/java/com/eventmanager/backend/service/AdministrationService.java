package com.eventmanager.backend.service;

import com.eventmanager.backend.dto.*;
import com.eventmanager.backend.exception.ApiException;
import com.eventmanager.backend.model.*;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;

@org.springframework.stereotype.Service
public class AdministrationService {
  private final MongoTemplate mongo;
  private final AuditService audit;

  public AdministrationService(MongoTemplate mongo, AuditService audit) {
    this.mongo = mongo;
    this.audit = audit;
  }

  public List<Category> categories() {
    return mongo.find(new Query().with(Sort.by("name")), Category.class);
  }

  @PreAuthorize("hasRole('ADMIN')")
  public Category createCategory(Requests.CategoryInput input, User actor) {
    Category c = new Category();
    c.setId(UUID.randomUUID().toString());
    c.setName(input.name().strip());
    c.setNormalizedName(c.getName().toLowerCase(Locale.ROOT));
    c.setActive(input.active());
    mongo.insert(c);
    audit.record(actor.getId(), "CATEGORY_CREATED", c.getId());
    return c;
  }

  @PreAuthorize("hasRole('ADMIN')")
  public Category updateCategory(String id, Requests.CategoryInput input, User actor) {
    var result =
        mongo.findAndModify(
            Query.query(Criteria.where("id").is(id)),
            new Update()
                .set("name", input.name().strip())
                .set("normalizedName", input.name().strip().toLowerCase(Locale.ROOT))
                .set("active", input.active()),
            FindAndModifyOptions.options().returnNew(true),
            Category.class);
    if (result == null) throw ApiException.missing();
    audit.record(actor.getId(), "CATEGORY_UPDATED", id);
    return result;
  }

  @PreAuthorize("hasRole('ADMIN')")
  public Views.Page<User> users(int page, int size) {
    pagination(page, size);
    return new Views.Page<>(
        mongo.find(
            new Query().with(Sort.by("email")).skip((long) page * size).limit(size), User.class),
        mongo.count(new Query(), User.class),
        page,
        size);
  }

  @PreAuthorize("hasRole('ADMIN')")
  public void access(String id, Requests.UserAccess input, User actor) {
    User target = mongo.findById(id, User.class);
    if (target == null) throw ApiException.missing();
    if (target.getRole().equals("ADMIN") && (!input.role().equals("ADMIN") || input.disabled()))
      throw ApiException.conflict(
          "Les administrateurs ne peuvent pas être désactivés ou rétrogradés par cette API");
    if (!input.role().equals(target.getRole())
        && mongo.exists(
            Query.query(
                Criteria.where("organizerId")
                    .is(id)
                    .and("status")
                    .is("PUBLISHED")
                    .and("startsAt")
                    .gt(Instant.now())),
            Event.class))
      throw ApiException.conflict("Annulez d’abord les événements à venir de cet organisateur");
    mongo.updateFirst(
        Query.query(Criteria.where("id").is(id)),
        new Update()
            .set("role", input.role())
            .set("disabled", input.disabled())
            .inc("tokenVersion", 1),
        User.class);
    audit.record(actor.getId(), "USER_ACCESS_UPDATED", id);
  }

  @PreAuthorize("hasRole('ADMIN')")
  public Views.Page<AuditEntry> audit(int page, int size) {
    pagination(page, size);
    return new Views.Page<>(
        mongo.find(
            new Query()
                .with(Sort.by(Sort.Direction.DESC, "createdAt"))
                .skip((long) page * size)
                .limit(size),
            AuditEntry.class),
        mongo.count(new Query(), AuditEntry.class),
        page,
        size);
  }

  public Map<String, Long> dashboard(User user) {
    Map<String, Long> result = new LinkedHashMap<>();
    Query registrations = Query.query(Criteria.where("registrations.userId").is(user.getId()));
    result.put("registrations", mongo.count(registrations, Event.class));
    result.put(
        "upcoming",
        mongo.count(
            Query.query(
                Criteria.where("registrations.userId")
                    .is(user.getId())
                    .and("startsAt")
                    .gt(Instant.now())
                    .and("status")
                    .is("PUBLISHED")),
            Event.class));
    if (!user.getRole().equals("USER"))
      result.put(
          "events",
          mongo.count(Query.query(Criteria.where("organizerId").is(user.getId())), Event.class));
    if (user.getRole().equals("ADMIN")) {
      result.put("users", mongo.count(new Query(), User.class));
      result.put("allEvents", mongo.count(new Query(), Event.class));
      result.put("categories", mongo.count(new Query(), Category.class));
    }
    return result;
  }

  public Map<String, Object> export(User user) {
    return Map.of(
        "profile",
        user,
        "events",
        mongo
            .find(
                Query.query(
                    new Criteria()
                        .orOperator(
                            Criteria.where("organizerId").is(user.getId()),
                            Criteria.where("registrations.userId").is(user.getId()))),
                Event.class)
            .stream()
            .map(e -> Views.event(e, user.getId()))
            .toList());
  }

  public void delete(User user) {
    if (user.getRole().equals("ADMIN"))
      throw ApiException.conflict(
          "La suppression d’un administrateur nécessite une procédure manuelle");
    if (mongo.exists(
        Query.query(
            Criteria.where("organizerId")
                .is(user.getId())
                .and("status")
                .is("PUBLISHED")
                .and("startsAt")
                .gt(Instant.now())),
        Event.class))
      throw ApiException.conflict("Annulez vos événements à venir avant de supprimer votre compte");
    mongo.updateMulti(
        Query.query(Criteria.where("registrations.userId").is(user.getId())),
        new Update()
            .pull("registrations", new org.bson.Document("userId", user.getId()))
            .inc("revision", 1),
        Event.class);
    mongo.remove(Query.query(Criteria.where("actorId").is(user.getId())), AuditEntry.class);
    mongo.remove(Query.query(Criteria.where("id").is(user.getId())), User.class);
  }

  private void pagination(int page, int size) {
    if (page < 0 || page > 10000 || size < 1 || size > 100)
      throw new ApiException(HttpStatus.BAD_REQUEST, "Pagination invalide");
  }
}
