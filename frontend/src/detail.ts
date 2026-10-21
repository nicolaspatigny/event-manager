import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, ActivatedRoute } from "@angular/router";
import { Api, EventItem, Category } from "./api";
@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (event) {
      <a class="back-link" routerLink="/">← Tous les événements</a>
      <section class="detail-layout">
        <div>
          <div class="detail-art">
            <span>{{ categoryName }}</span
            ><strong aria-hidden="true">✳︎</strong>
          </div>
          <p class="eyebrow">{{ categoryName }}</p>
          <h1>{{ event.title }}</h1>
          <h3>À propos de ce rendez-vous</h3>
          <p class="description">{{ event.description }}</p>
        </div>
        <aside class="booking">
          <span class="pill">{{
            event.status === "CANCELLED"
              ? "Annulé"
              : past
                ? "Terminé"
                : "À venir"
          }}</span>
          <h2>On se retrouve ?</h2>
          <dl>
            <dt>QUAND</dt>
            <dd>
              {{ event.startsAt | date: "EEEE d MMMM yyyy" }}<br />{{
                event.startsAt | date: "HH:mm"
              }}
            </dd>
            <dt>OÙ</dt>
            <dd>{{ event.location }}</dd>
            <dt>LES PLACES</dt>
            <dd>
              {{ event.registeredCount }} / {{ event.capacity }} participants
            </dd>
          </dl>
          <progress
            [max]="event.capacity"
            [value]="event.registeredCount"
            aria-label="Places réservées"
          ></progress>
          @if (event.registered) {
            <p class="success">✓ Vous êtes inscrit à cet événement.</p>
            <button
              class="secondary wide"
              [disabled]="busy || past"
              (click)="unregister()"
            >
              Annuler mon inscription
            </button>
          } @else if (!api.user()) {
            <a class="button wide" routerLink="/login"
              >Se connecter pour participer →</a
            >
          } @else if (api.user()?.role === "USER") {
            <button
              class="wide"
              [disabled]="
                busy ||
                past ||
                event.status === 'CANCELLED' ||
                event.availablePlaces === 0
              "
              (click)="register()"
            >
              {{
                event.availablePlaces === 0
                  ? "Événement complet"
                  : "Réserver ma place →"
              }}
            </button>
          } @else {
            <p class="muted">
              Les inscriptions sont réservées aux comptes participants.
            </p>
          }
          @if (canManage) {
            <a
              class="button secondary wide"
              [routerLink]="['/organizer/edit', event.id]"
              >Modifier l’événement</a
            ><button class="secondary wide" (click)="participants()">
              Voir les participants</button
            ><button
              class="danger wide"
              [disabled]="past || event.status === 'CANCELLED' || busy"
              (click)="cancel()"
            >
              Annuler l’événement
            </button>
          }
        </aside>
      </section>
      @if (roster) {
        <section class="panel">
          <h2>Participants</h2>
          <ul>
            @for (p of roster; track p.id) {
              <li>
                {{ p.firstName }} {{ p.lastName }} ·
                {{ p.registeredAt | date: "short" }}
              </li>
            } @empty {
              <li>Aucune inscription.</li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class Detail {
  api = inject(Api);
  route = inject(ActivatedRoute);
  event: EventItem | null = null;
  categoryName = "Événement";
  busy = false;
  roster:
    | {
        id: string;
        firstName: string;
        lastName: string;
        registeredAt: string;
      }[]
    | null = null;
  constructor() {
    this.route.paramMap.subscribe(() => this.load());
  }
  get past() {
    return (
      !!this.event && new Date(this.event.startsAt).getTime() <= Date.now()
    );
  }
  get canManage() {
    return (
      this.api.user()?.role === "ADMIN" ||
      (this.api.user()?.role === "ORGANIZER" &&
        this.event?.organizerId === this.api.user()?.id)
    );
  }
  load() {
    const id = this.route.snapshot.paramMap.get("id");
    this.api.request<EventItem>("GET", "/events/" + id).subscribe({
      next: (e) => {
        this.event = e;
        this.api.request<Category[]>("GET", "/categories").subscribe({
          next: (c) =>
            (this.categoryName =
              c.find((x) => x.id === e.categoryId)?.name || "Événement"),
          error: () => {},
        });
      },
      error: () => {},
    });
  }
  register() {
    this.busy = true;
    this.api
      .request<EventItem>(
        "POST",
        "/events/" + this.event!.id + "/registrations",
      )
      .subscribe({
        next: (e) => {
          this.event = e;
          this.busy = false;
          this.api.message("Votre place est réservée. À bientôt !");
        },
        error: () => (this.busy = false),
      });
  }
  unregister() {
    if (!confirm("Annuler votre inscription ?")) return;
    this.busy = true;
    this.api
      .request("DELETE", "/events/" + this.event!.id + "/registrations/me")
      .subscribe({
        next: () => {
          this.busy = false;
          this.load();
          this.api.message("Inscription annulée.");
        },
        error: () => (this.busy = false),
      });
  }
  cancel() {
    if (!confirm("Annuler cet événement pour tous les participants ?")) return;
    this.busy = true;
    this.api.request("DELETE", "/events/" + this.event!.id).subscribe({
      next: () => {
        this.busy = false;
        this.load();
      },
      error: () => (this.busy = false),
    });
  }
  participants() {
    this.api
      .request<NonNullable<Detail["roster"]>>(
        "GET",
        "/events/" + this.event!.id + "/participants",
      )
      .subscribe({ next: (p) => (this.roster = p), error: () => {} });
  }
}
