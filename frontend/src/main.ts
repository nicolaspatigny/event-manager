import "zone.js";
import {
  Component,
  inject,
  LOCALE_ID,
  provideZoneChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { registerLocaleData } from "@angular/common";
import localeFr from "@angular/common/locales/fr";
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  provideRouter,
  CanActivateFn,
  withInMemoryScrolling,
} from "@angular/router";
import { Api } from "./api";
import { Catalog } from "./catalog";
import { Auth } from "./auth";
import { Detail } from "./detail";
import { Workspace, Editor } from "./workspace";
import { Admin } from "./admin";
import { Profile, Privacy } from "./profile";
registerLocaleData(localeFr);
const authenticated: CanActivateFn = () =>
  inject(Api).user() ? true : inject(Router).parseUrl("/login");
const organizer: CanActivateFn = () =>
  inject(Api).isOrganizer() ? true : inject(Router).parseUrl("/dashboard");
const admin: CanActivateFn = () =>
  inject(Api).user()?.role === "ADMIN"
    ? true
    : inject(Router).parseUrl("/dashboard");
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: ` <a class="skip-link" href="#main">Aller au contenu</a>
    <header>
      <a class="brand" routerLink="/" aria-label="Rassemble, accueil"
        ><span aria-hidden="true">✳︎</span> rassemble<span class="brand-dot"
          >.</span
        ></a
      >
      <nav aria-label="Navigation principale">
        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          >L’agenda</a
        >
        @if (api.user()) {
          <a routerLink="/dashboard" routerLinkActive="active">Mon espace</a>
          @if (api.isOrganizer()) {
            <a routerLink="/organizer" routerLinkActive="active">Organiser</a>
          }
          @if (api.user()?.role === "ADMIN") {
            <a routerLink="/admin" routerLinkActive="active">Administration</a>
          }
          <a routerLink="/profile" routerLinkActive="active">Mon profil</a
          ><button class="nav-button" (click)="logout()">Déconnexion</button>
        } @else {
          <a routerLink="/login">Connexion</a
          ><a routerLink="/register" class="button small">Nous rejoindre →</a>
        }
      </nav>
    </header>
    <main id="main">
      @if (api.error()) {
        <div class="alert error" role="alert">
          <span>{{ api.error() }}</span
          ><button
            class="dismiss"
            aria-label="Fermer l’erreur"
            (click)="api.error.set('')"
          >
            ×
          </button>
        </div>
      }
      @if (api.notice()) {
        <div class="alert" role="status">
          <span>{{ api.notice() }}</span
          ><button
            class="dismiss"
            aria-label="Fermer la notification"
            (click)="api.notice.set('')"
          >
            ×
          </button>
        </div>
      }
      <router-outlet />
    </main>
    <footer>
      <div>
        <a class="brand" routerLink="/"><span>✳︎</span> rassemble.</a>
        <p>Des événements. Des gens. Des liens.</p>
      </div>
      <div>
        <a routerLink="/privacy">Confidentialité & données</a>
        <p>Projet CDA · Une plateforme pensée pour se retrouver.</p>
      </div>
    </footer>`,
})
class App {
  api = inject(Api);
  router = inject(Router);
  logout() {
    this.api.logout().subscribe({
      next: () => this.router.navigateByUrl("/"),
      error: () => {
        this.api.clear();
        this.router.navigateByUrl("/");
      },
    });
  }
}
bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: "fr" },
    provideRouter(
      [
        { path: "", component: Catalog },
        { path: "login", component: Auth },
        { path: "register", component: Auth, data: { register: true } },
        { path: "events/:id", component: Detail },
        {
          path: "dashboard",
          component: Workspace,
          canActivate: [authenticated],
        },
        {
          path: "organizer",
          component: Workspace,
          canActivate: [authenticated, organizer],
          data: { organizer: true },
        },
        {
          path: "organizer/new",
          component: Editor,
          canActivate: [authenticated, organizer],
        },
        {
          path: "organizer/edit/:id",
          component: Editor,
          canActivate: [authenticated, organizer],
        },
        {
          path: "admin",
          component: Admin,
          canActivate: [authenticated, admin],
        },
        { path: "profile", component: Profile, canActivate: [authenticated] },
        { path: "privacy", component: Privacy },
        { path: "**", redirectTo: "" },
      ],
      withInMemoryScrolling({
        scrollPositionRestoration: "enabled",
        anchorScrolling: "enabled",
      }),
    ),
  ],
}).catch(console.error);
