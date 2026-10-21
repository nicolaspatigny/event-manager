import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Api, EventItem, Category, Page } from "./api";
@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: ` <div class="section-heading">
      <div>
        <p class="eyebrow">VOTRE ESPACE PERSONNEL</p>
        <h1>
          Bonjour, {{ api.user()?.firstName }}<span class="accent">.</span>
        </h1>
        <p class="muted">
          {{
            organizer
              ? "Vos idées prennent vie ici."
              : "Vos prochains moments à partager."
          }}
        </p>
      </div>
      @if (organizer) {
        <a class="button" routerLink="/organizer/new">Créer un événement +</a>
      }
    </div>
    <div class="stats">
      @for (stat of stats | keyvalue; track stat.key) {
        <div class="stat">
          <strong>{{ stat.value }}</strong
          ><span>{{ labels[stat.key] || stat.key }}</span>
        </div>
      }
    </div>
    <div class="section-heading">
      <h2>
        {{ organizer ? "Mes événements" : "Mes inscriptions & mon historique" }}
      </h2>
      <a routerLink="/">Explorer l’agenda →</a>
    </div>
    <div class="panel">
      @for (e of events; track e.id) {
        <a class="event-row" [routerLink]="['/events', e.id]"
          ><div class="row-date">
            {{ e.startsAt | date: "dd"
            }}<small>{{ e.startsAt | date: "MMM" }}</small>
          </div>
          <div>
            <h3>{{ e.title }}</h3>
            <p class="muted">
              {{ e.location }} · {{ e.startsAt | date: "shortTime" }}
            </p>
          </div>
          <span class="pill">{{
            e.status === "CANCELLED"
              ? "Annulé"
              : isPast(e)
                ? "Terminé"
                : organizer
                  ? e.registeredCount + " inscrits"
                  : "Inscrit"
          }}</span
          ><span aria-hidden="true">→</span></a
        >
      } @empty {
        <div class="empty">
          <h3>Tout commence par une première rencontre.</h3>
          <p>
            {{
              organizer
                ? "Créez votre premier événement."
                : "Découvrez l’agenda et réservez votre première place."
            }}
          </p>
        </div>
      }
    </div>
    <div class="pagination">
      <button
        class="secondary"
        [disabled]="page === 0"
        (click)="load(page - 1)"
      >
        Précédent</button
      ><span>Page {{ page + 1 }}</span
      ><button
        class="secondary"
        [disabled]="(page + 1) * 12 >= total"
        (click)="load(page + 1)"
      >
        Suivant
      </button>
    </div>`,
})
export class Workspace {
  api = inject(Api);
  route = inject(ActivatedRoute);
  organizer = false;
  events: EventItem[] = [];
  stats: Record<string, number> = {};
  page = 0;
  total = 0;
  labels: Record<string, string> = {
    registrations: "Inscriptions",
    upcoming: "À venir",
    events: "Mes événements",
    users: "Utilisateurs",
    allEvents: "Événements au total",
    categories: "Catégories",
  };
  constructor() {
    this.route.data.subscribe((d) => {
      this.organizer = !!d["organizer"];
      this.load(0);
    });
  }
  isPast(e: EventItem) {
    return new Date(e.startsAt) < new Date();
  }
  load(page: number) {
    this.api
      .request<Record<string, number>>("GET", "/dashboard")
      .subscribe({ next: (s) => (this.stats = s), error: () => {} });
    this.api
      .request<Page<EventItem>>(
        "GET",
        "/events?scope=" +
          (this.organizer ? "mine" : "registrations") +
          "&page=" +
          page,
      )
      .subscribe({
        next: (r) => {
          this.events = r.items;
          this.page = r.page;
          this.total = r.total;
        },
        error: () => {},
      });
  }
}
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: ` <a class="back-link" routerLink="/organizer"
      >← Mon espace organisateur</a
    >
    <div class="narrow panel">
      <p class="eyebrow">FAIRE VIVRE UNE IDÉE</p>
      <h1>{{ id ? "Modifier le rendez-vous" : "Un nouveau rendez-vous" }}</h1>
      <form (ngSubmit)="save()" #form="ngForm">
        <label
          >Titre<input
            name="title"
            [(ngModel)]="model.title"
            required
            maxlength="120" /></label
        ><label
          >Description<textarea
            name="description"
            [(ngModel)]="model.description"
            required
            maxlength="5000"
            rows="6"
          ></textarea>
        </label>
        <div class="two-cols">
          <label
            >Date et heure<input
              type="datetime-local"
              name="startsAt"
              [(ngModel)]="date"
              required /></label
          ><label
            >Capacité<input
              type="number"
              name="capacity"
              [(ngModel)]="model.capacity"
              min="1"
              max="1000"
              required
          /></label>
        </div>
        <label
          >Lieu<input
            name="location"
            [(ngModel)]="model.location"
            required
            maxlength="250" /></label
        ><label
          >Catégorie<select
            aria-label="Catégorie"
            name="categoryId"
            [(ngModel)]="model.categoryId"
            required
          >
            <option value="">Choisissez une catégorie</option>
            @for (c of categories; track c.id) {
              @if (c.active) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            }
          </select></label
        >
        <p class="muted">
          La date doit être future. La capacité ne peut pas être inférieure au
          nombre d’inscrits.
        </p>
        <button [disabled]="form.invalid || busy">
          {{
            busy
              ? "Enregistrement…"
              : id
                ? "Enregistrer les modifications"
                : "Publier l’événement →"
          }}
        </button>
      </form>
    </div>`,
})
export class Editor {
  api = inject(Api);
  route = inject(ActivatedRoute);
  router = inject(Router);
  id = this.route.snapshot.paramMap.get("id");
  date = "";
  busy = false;
  categories: Category[] = [];
  model = {
    title: "",
    description: "",
    startsAt: "",
    location: "",
    categoryId: "",
    capacity: 20,
    revision: 0,
  };
  constructor() {
    this.api
      .request<Category[]>("GET", "/categories")
      .subscribe({ next: (c) => (this.categories = c), error: () => {} });
    if (this.id)
      this.api.request<EventItem>("GET", "/events/" + this.id).subscribe({
        next: (e) => {
          this.model = { ...e };
          const d = new Date(e.startsAt);
          this.date = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        },
        error: () => {},
      });
  }
  save() {
    if (!this.date || isNaN(Date.parse(this.date))) return;
    this.busy = true;
    this.api
      .request<EventItem>(
        this.id ? "PUT" : "POST",
        "/events" + (this.id ? "/" + this.id : ""),
        { ...this.model, startsAt: new Date(this.date).toISOString() },
      )
      .subscribe({
        next: (e) => {
          this.api.message("Événement enregistré.");
          this.router.navigate(["/events", e.id]);
        },
        error: () => (this.busy = false),
      });
  }
}
