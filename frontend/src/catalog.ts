import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Api, EventItem, Category, Page } from "./api";
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: ` <section class="hero">
      <div>
        <p class="eyebrow">SE RETROUVER. DÉCOUVRIR. PARTAGER.</p>
        <h1>Les belles rencontres<br />commencent <em>ici.</em></h1>
        <p class="lead">
          Un atelier, un concert, une nouvelle passion.<br />Trouvez votre
          prochain rendez-vous.
        </p>
        <a class="button" href="#events"
          >Explorer les événements <span>→</span></a
        >
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="orbit"></div>
        <div class="art-card">
          <span>À VIVRE ENSEMBLE</span
          ><strong>Faites place<br />à l’inattendu.</strong>
          <div class="flower">✳︎</div>
          <small>De nouvelles idées, de nouveaux liens.</small>
        </div>
        <div class="art-sticker">ON Y VA ? →</div>
      </div>
    </section>
    <section id="events">
      <div class="section-heading">
        <div>
          <p class="eyebrow">L’AGENDA DES CURIOSITÉS</p>
          <h2>Votre prochaine découverte</h2>
        </div>
        <span class="muted">{{ total }} événement(s)</span>
      </div>
      <form class="filters" (ngSubmit)="search(0)">
        <label
          >Rechercher<input
            name="q"
            [(ngModel)]="q"
            placeholder="Un titre, une envie…"
            maxlength="120" /></label
        ><label
          >Catégorie<select name="category" [(ngModel)]="category">
            <option value="">Toutes les catégories</option>
            @for (c of categories; track c.id) {
              <option [value]="c.id">{{ c.name }}</option>
            }
          </select></label
        ><label
          >Lieu<input
            name="location"
            [(ngModel)]="location"
            placeholder="Ville ou lieu"
            maxlength="250" /></label
        ><label
          >À partir du<input
            type="date"
            name="from"
            [(ngModel)]="from" /></label
        ><button type="submit">Rechercher</button>
      </form>
      @if (loading) {
        <p role="status">Chargement des événements…</p>
      } @else {
        <div class="event-grid">
          @for (event of events; track event.id) {
            <a class="event-card" [routerLink]="['/events', event.id]"
              ><div
                class="event-art"
                [class.alt]="$index % 3 === 1"
                [class.third]="$index % 3 === 2"
              >
                <span class="category-tag">{{
                  categoryName(event.categoryId)
                }}</span
                ><span class="event-symbol" aria-hidden="true">{{
                  $index % 3 === 0 ? "✳︎" : $index % 3 === 1 ? "◒" : "✦"
                }}</span
                ><span class="date-stamp"
                  >{{ event.startsAt | date: "dd"
                  }}<small>{{ event.startsAt | date: "MMM" }}</small></span
                >
              </div>
              <div class="event-body">
                <p class="muted">
                  {{ event.startsAt | date: "EEEE d MMMM · HH:mm" }}
                </p>
                <h3>{{ event.title }}</h3>
                <p class="location">→ {{ event.location }}</p>
                <div class="card-bottom">
                  <span [class.full]="event.availablePlaces === 0">{{
                    event.availablePlaces === 0
                      ? "Complet"
                      : event.availablePlaces + " places disponibles"
                  }}</span
                  ><strong aria-hidden="true">→</strong>
                </div>
              </div></a
            >
          }
        </div>
        @if (events.length === 0) {
          <div class="empty">
            <span>✳︎</span>
            <h3>Le prochain rendez-vous reste à écrire.</h3>
            <p>
              Aucun événement ne correspond à ces filtres. Essayez une autre
              recherche.
            </p>
          </div>
        }
      }
      <div class="pagination">
        <button
          class="secondary"
          [disabled]="page === 0 || loading"
          (click)="search(page - 1)"
        >
          ← Précédent</button
        ><span>Page {{ page + 1 }}</span
        ><button
          class="secondary"
          [disabled]="(page + 1) * 12 >= total || loading"
          (click)="search(page + 1)"
        >
          Suivant →
        </button>
      </div>
    </section>
    <section class="callout">
      <span class="big-star" aria-hidden="true">✳︎</span>
      <div>
        <p class="eyebrow">LES MEILLEURES IDÉES SE PARTAGENT</p>
        <h2>Et si le prochain événement,<br />c’était le vôtre ?</h2>
        <p>
          Créez votre compte, puis contactez l’administrateur pour devenir
          organisateur.
        </p>
        <a routerLink="/register" class="button cream">Rejoindre Rassemble →</a>
      </div>
    </section>`,
})
export class Catalog {
  api = inject(Api);
  events: EventItem[] = [];
  categories: Category[] = [];
  q = "";
  category = "";
  location = "";
  from = "";
  page = 0;
  total = 0;
  loading = false;
  constructor() {
    this.api
      .request<Category[]>("GET", "/categories")
      .subscribe({ next: (c) => (this.categories = c), error: () => {} });
    this.search(0);
  }
  categoryName(id: string) {
    return this.categories.find((c) => c.id === id)?.name || "À découvrir";
  }
  search(page: number) {
    this.loading = true;
    const p = new URLSearchParams({
      q: this.q,
      category: this.category,
      location: this.location,
      page: String(page),
    });
    if (this.from)
      p.set("from", new Date(this.from + "T00:00:00").toISOString());
    this.api.request<Page<EventItem>>("GET", "/events?" + p).subscribe({
      next: (r) => {
        this.events = r.items;
        this.total = r.total;
        this.page = r.page;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
