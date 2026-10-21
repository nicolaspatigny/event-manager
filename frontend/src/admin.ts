import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Api, User, Category, EventItem, Page } from "./api";
@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: ` <p class="eyebrow">PILOTER LA COMMUNAUTÉ</p>
    <h1>Administration<span class="accent">.</span></h1>
    <div class="tabs">
      <button [class.secondary]="tab !== 'users'" (click)="tab = 'users'">
        Utilisateurs</button
      ><button
        [class.secondary]="tab !== 'categories'"
        (click)="tab = 'categories'"
      >
        Catégories</button
      ><button
        [class.secondary]="tab !== 'events'"
        (click)="tab = 'events'; loadEvents(0)"
      >
        Événements</button
      ><button
        [class.secondary]="tab !== 'audit'"
        (click)="tab = 'audit'; loadAudit(0)"
      >
        Journal d’activité
      </button>
    </div>
    @if (tab === "users") {
      <section class="panel">
        <h2>Comptes & autorisations</h2>
        <p class="muted">
          Les nouveaux comptes sont participants. Accordez le rôle organisateur
          après vérification.
        </p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Compte</th>
                <th>Rôle</th>
                <th>État</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users; track u.id) {
                <tr>
                  <td>
                    {{ u.firstName }} {{ u.lastName
                    }}<small>{{ u.email }}</small>
                  </td>
                  <td>
                    <select
                      [attr.aria-label]="'Rôle de ' + u.email"
                      [(ngModel)]="u.role"
                    >
                      <option value="USER">Participant</option>
                      <option value="ORGANIZER">Organisateur</option>
                      <option value="ADMIN">Administrateur</option>
                    </select>
                  </td>
                  <td>
                    <label class="check"
                      ><input type="checkbox" [(ngModel)]="u.disabled" />
                      Désactivé</label
                    >
                  </td>
                  <td>
                    <button class="secondary" (click)="saveUser(u)">
                      Enregistrer
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button
            class="secondary"
            [disabled]="userPage === 0"
            (click)="loadUsers(userPage - 1)"
          >
            Précédent</button
          ><span>Page {{ userPage + 1 }}</span
          ><button
            class="secondary"
            [disabled]="(userPage + 1) * 20 >= userTotal"
            (click)="loadUsers(userPage + 1)"
          >
            Suivant
          </button>
        </div>
      </section>
    }
    @if (tab === "categories") {
      <section class="panel">
        <h2>Catégories de l’agenda</h2>
        <form class="inline-form" (ngSubmit)="createCategory()" #form="ngForm">
          <label
            >Nouvelle catégorie<input
              name="category"
              [(ngModel)]="categoryName"
              required
              maxlength="80" /></label
          ><button [disabled]="form.invalid">Ajouter +</button>
        </form>
        @for (c of categories; track c.id) {
          <div class="category-row">
            <input
              [attr.aria-label]="'Nom de la catégorie ' + c.name"
              [(ngModel)]="c.name"
              maxlength="80"
            /><label class="check"
              ><input type="checkbox" [(ngModel)]="c.active" /> Active</label
            ><button class="secondary" (click)="saveCategory(c)">
              Enregistrer
            </button>
          </div>
        }
        <p class="muted">
          Une catégorie inactive reste visible sur les événements existants et
          ne peut plus être choisie pour une nouvelle publication.
        </p>
      </section>
    }
    @if (tab === "events") {
      <section class="panel">
        <h2>Tous les événements</h2>
        @for (e of events; track e.id) {
          <div class="event-row">
            <div>
              <a [routerLink]="['/events', e.id]">{{ e.title }}</a>
              <p class="muted">
                {{ e.startsAt | date: "short" }} · {{ e.status }}
              </p>
            </div>
            <a class="button secondary" [routerLink]="['/organizer/edit', e.id]"
              >Gérer →</a
            >
          </div>
        }
        <div class="pagination">
          <button
            class="secondary"
            [disabled]="eventPage === 0"
            (click)="loadEvents(eventPage - 1)"
          >
            Précédent</button
          ><span>Page {{ eventPage + 1 }}</span
          ><button
            class="secondary"
            [disabled]="(eventPage + 1) * 20 >= eventTotal"
            (click)="loadEvents(eventPage + 1)"
          >
            Suivant
          </button>
        </div>
      </section>
    }
    @if (tab === "audit") {
      <section class="panel">
        <h2>Journal d’activité</h2>
        <p class="muted">
          Identifiants techniques uniquement. Suppression automatique après 90
          jours.
        </p>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Acteur</th>
                <th>Ressource</th>
              </tr>
            </thead>
            <tbody>
              @for (a of audit; track a.id) {
                <tr>
                  <td>{{ a.createdAt | date: "short" }}</td>
                  <td>{{ a.action }}</td>
                  <td>{{ a.actorId || "Anonyme" }}</td>
                  <td>{{ a.resourceId || "—" }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button
            class="secondary"
            [disabled]="auditPage === 0"
            (click)="loadAudit(auditPage - 1)"
          >
            Précédent</button
          ><span>Page {{ auditPage + 1 }}</span
          ><button
            class="secondary"
            [disabled]="(auditPage + 1) * 20 >= auditTotal"
            (click)="loadAudit(auditPage + 1)"
          >
            Suivant
          </button>
        </div>
      </section>
    }`,
})
export class Admin {
  api = inject(Api);
  tab = "users";
  users: User[] = [];
  categories: Category[] = [];
  events: EventItem[] = [];
  audit: {
    id: string;
    createdAt: string;
    action: string;
    actorId: string;
    resourceId: string;
  }[] = [];
  categoryName = "";
  userPage = 0;
  userTotal = 0;
  eventPage = 0;
  eventTotal = 0;
  auditPage = 0;
  auditTotal = 0;
  constructor() {
    this.loadUsers(0);
    this.loadCategories();
  }
  loadUsers(page: number) {
    this.api.request<Page<User>>("GET", "/admin/users?page=" + page).subscribe({
      next: (r) => {
        this.users = r.items;
        this.userPage = r.page;
        this.userTotal = r.total;
      },
      error: () => {},
    });
  }
  saveUser(u: User) {
    if (
      !confirm(
        "Appliquer les droits de ce compte ? Ses sessions seront déconnectées.",
      )
    )
      return;
    this.api
      .request("PUT", "/admin/users/" + u.id, {
        role: u.role,
        disabled: !!u.disabled,
      })
      .subscribe({
        next: () => {
          this.api.message("Droits enregistrés.");
          this.loadUsers(this.userPage);
        },
        error: () => {},
      });
  }
  loadCategories() {
    this.api
      .request<Category[]>("GET", "/categories")
      .subscribe({ next: (c) => (this.categories = c), error: () => {} });
  }
  createCategory() {
    this.api
      .request("POST", "/admin/categories", {
        name: this.categoryName,
        active: true,
      })
      .subscribe({
        next: () => {
          this.categoryName = "";
          this.loadCategories();
        },
        error: () => {},
      });
  }
  saveCategory(c: Category) {
    this.api
      .request("PUT", "/admin/categories/" + c.id, {
        name: c.name,
        active: c.active,
      })
      .subscribe({
        next: () => this.api.message("Catégorie enregistrée."),
        error: () => {},
      });
  }
  loadEvents(page: number) {
    this.api
      .request<Page<EventItem>>(
        "GET",
        "/events?scope=admin&size=20&page=" + page,
      )
      .subscribe({
        next: (r) => {
          this.events = r.items;
          this.eventPage = r.page;
          this.eventTotal = r.total;
        },
        error: () => {},
      });
  }
  loadAudit(page: number) {
    this.api
      .request<Page<Admin["audit"][number]>>("GET", "/admin/audit?page=" + page)
      .subscribe({
        next: (r) => {
          this.audit = r.items;
          this.auditPage = r.page;
          this.auditTotal = r.total;
        },
        error: () => {},
      });
  }
}
