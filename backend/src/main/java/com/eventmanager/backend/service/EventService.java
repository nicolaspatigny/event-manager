package com.eventmanager.backend.service;

import com.eventmanager.backend.dto.*;
import com.eventmanager.backend.exception.ApiException;
import com.eventmanager.backend.model.*;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.*;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Service;

@Service
public class EventService {
  private final MongoTemplate mongo;
  private final AuditService audit;

  public EventService(MongoTemplate mongo, AuditService audit) {
    this.mongo = mongo;
    this.audit = audit;
  }

  public Event require(String id) {
    Event event = mongo.findById(id, Event.class);
    if (event == null) throw ApiException.missing();
    return event;
  }

  public Views.EventView detail(String id, User actor) {
    return Views.event(require(id), actor == null ? null : actor.getId());
  }

  public Views.Page<Views.EventView> search(
      String q,
      String category,
      String location,
      Instant from,
      Instant to,
      int page,
      int size,
      String scope,
      User actor) {
    if (page < 0
        || page > 10000
        || size < 1
        || size > 100
        || q.length() > 120
        || location.length() > 250
        || (from != null && to != null && from.isAfter(to)))
      throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Filtres invalides");
    List<Criteria> conditions = new ArrayList<>();
    if (!q.isBlank()) conditions.add(Criteria.where("title").regex(Pattern.quote(q), "i"));
    if (!location.isBlank())
      conditions.add(Criteria.where("location").regex(Pattern.quote(location), "i"));
    if (!category.isBlank()) conditions.add(Criteria.where("categoryId").is(category));
    if (from != null) conditions.add(Criteria.where("startsAt").gte(from));
    if (to != null) conditions.add(Criteria.where("startsAt").lte(to));
    switch (scope) {
      case "mine" -> {
        organizer(actor);
        conditions.add(Criteria.where("organizerId").is(actor.getId()));
      }
      case "registrations" -> {
        if (actor == null) throw ApiException.forbidden();
        conditions.add(Criteria.where("registrations.userId").is(actor.getId()));
      }
      case "admin" -> {
        if (actor == null || !actor.getRole().equals("ADMIN")) throw ApiException.forbidden();
      }
      case "public" -> conditions.add(Criteria.where("status").is("PUBLISHED"));
      default ->
          throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Vue invalide");
    }
    Criteria c =
        conditions.isEmpty()
            ? new Criteria()
            : new Criteria().andOperator(conditions.toArray(Criteria[]::new));
    long total = mongo.count(Query.query(c), Event.class);
    var events =
        mongo.find(
            Query.query(c)
                .with(Sort.by(Sort.Direction.ASC, "startsAt").and(Sort.by("id")))
                .skip((long) page * size)
                .limit(size),
            Event.class);
    return new Views.Page<>(
        events.stream().map(e -> Views.event(e, actor == null ? null : actor.getId())).toList(),
        total,
        page,
        size);
  }

  public Event create(Requests.EventInput input, User actor) {
    organizer(actor);
    category(input.categoryId());
    Event event = new Event();
    event.setId(UUID.randomUUID().toString());
    assign(event, input);
    event.setOrganizerId(actor.getId());
    mongo.insert(event);
    audit.record(actor.getId(), "EVENT_CREATED", event.getId());
    return event;
  }

  public Event update(String id, Requests.EventInput input, User actor) {
    Event old = require(id);
    owner(old, actor);
    category(input.categoryId());
    if (!old.getStatus().equals("PUBLISHED"))
      throw ApiException.conflict("Un événement annulé ne peut plus être modifié");
    Query query =
        Query.query(
            Criteria.where("id")
                .is(id)
                .and("revision")
                .is(input.revision())
                .and("status")
                .is("PUBLISHED"));
    query.addCriteria(
        Criteria.where("$expr")
            .is(
                new Document(
                    "$lte", List.of(new Document("$size", "$registrations"), input.capacity()))));
    Update update =
        new Update()
            .set("title", input.title().strip())
            .set("description", input.description().strip())
            .set("location", input.location().strip())
            .set("startsAt", input.startsAt())
            .set("categoryId", input.categoryId())
            .set("capacity", input.capacity())
            .inc("revision", 1);
    Event result =
        mongo.findAndModify(
            query, update, FindAndModifyOptions.options().returnNew(true), Event.class);
    if (result == null)
      throw ApiException.conflict(
          "Événement modifié entre-temps ou capacité inférieure aux inscriptions. Rechargez la"
              + " page.");
    audit.record(actor.getId(), "EVENT_UPDATED", id);
    return result;
  }

  public void cancel(String id, User actor) {
    Event event = require(id);
    owner(event, actor);
    if (event.getStartsAt().isBefore(Instant.now()))
      throw ApiException.conflict("Un événement passé ne peut pas être annulé");
    mongo.updateFirst(
        Query.query(Criteria.where("id").is(id)),
        new Update().set("status", "CANCELLED").inc("revision", 1),
        Event.class);
    audit.record(actor.getId(), "EVENT_CANCELLED", id);
  }

  public Event register(String id, User actor) {
    if (!actor.getRole().equals("USER")) throw ApiException.forbidden();
    require(id);
    Query query =
        Query.query(
            Criteria.where("id")
                .is(id)
                .and("status")
                .is("PUBLISHED")
                .and("startsAt")
                .gt(Instant.now())
                .and("registrations.userId")
                .ne(actor.getId()));
    query.addCriteria(
        Criteria.where("$expr")
            .is(
                new Document(
                    "$lt", List.of(new Document("$size", "$registrations"), "$capacity"))));
    Event event =
        mongo.findAndModify(
            query,
            new Update()
                .push("registrations", new Event.Registration(actor.getId(), Instant.now()))
                .inc("revision", 1),
            FindAndModifyOptions.options().returnNew(true),
            Event.class);
    if (event == null)
      throw ApiException.conflict(
          "Inscription impossible : événement complet, passé, annulé ou inscription existante");
    audit.record(actor.getId(), "REGISTRATION_CREATED", id);
    return event;
  }

  public void unregister(String id, User actor) {
    require(id);
    Query query =
        Query.query(
            Criteria.where("id")
                .is(id)
                .and("startsAt")
                .gt(Instant.now())
                .and("registrations.userId")
                .is(actor.getId()));
    var result =
        mongo.updateFirst(
            query,
            new Update()
                .pull("registrations", new Document("userId", actor.getId()))
                .inc("revision", 1),
            Event.class);
    if (result.getModifiedCount() == 0)
      throw ApiException.conflict("Inscription absente ou événement passé");
    audit.record(actor.getId(), "REGISTRATION_CANCELLED", id);
  }

  public List<Map<String, Object>> participants(String id, User actor) {
    Event event = require(id);
    owner(event, actor);
    return event.getRegistrations().stream()
        .map(
            r -> {
              User u = mongo.findById(r.userId(), User.class);
              Map<String, Object> view = new LinkedHashMap<>();
              view.put("id", r.userId());
              view.put("firstName", u == null ? "Compte supprimé" : u.getFirstName());
              view.put("lastName", u == null ? "" : u.getLastName());
              view.put("registeredAt", r.registeredAt());
              return view;
            })
        .toList();
  }

  private void category(String id) {
    Category c = mongo.findById(id, Category.class);
    if (c == null || !c.isActive())
      throw ApiException.conflict("Catégorie inactive ou introuvable");
  }

  private void assign(Event e, Requests.EventInput i) {
    e.setTitle(i.title().strip());
    e.setDescription(i.description().strip());
    e.setStartsAt(i.startsAt());
    e.setLocation(i.location().strip());
    e.setCategoryId(i.categoryId());
    e.setCapacity(i.capacity());
  }

  private void organizer(User actor) {
    if (actor == null || !(actor.getRole().equals("ORGANIZER") || actor.getRole().equals("ADMIN")))
      throw ApiException.forbidden();
  }

  private void owner(Event event, User actor) {
    organizer(actor);
    if (!actor.getRole().equals("ADMIN") && !event.getOrganizerId().equals(actor.getId()))
      throw ApiException.forbidden();
  }
}
