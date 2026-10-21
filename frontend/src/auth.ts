import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink, ActivatedRoute } from "@angular/router";
import { Api } from "./api";
@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: ` <section class="auth-layout">
    <div class="auth-story">
      <p class="eyebrow">BIENVENUE CHEZ RASSEMBLE</p>
      <h1>Plus de moments.<br />Plus de <em>liens.</em></h1>
      <div class="huge-symbol" aria-hidden="true">✳︎</div>
      <p>
        Un compte pour découvrir, participer<br />et faire de belles rencontres.
      </p>
    </div>
    <div class="form-panel">
      <p class="eyebrow">VOTRE ESPACE</p>
      <h2>
        {{ register ? "Créons votre compte." : "Heureux de vous revoir." }}
      </h2>
      <p class="muted">
        {{
          register
            ? "Quelques informations et l’aventure commence."
            : "Connectez-vous pour retrouver vos rendez-vous."
        }}
      </p>
      <form (ngSubmit)="submit()" #form="ngForm">
        @if (register) {
          <div class="two-cols">
            <label
              >Prénom<input
                name="firstName"
                [(ngModel)]="firstName"
                required
                maxlength="80"
                autocomplete="given-name" /></label
            ><label
              >Nom<input
                name="lastName"
                [(ngModel)]="lastName"
                required
                maxlength="80"
                autocomplete="family-name"
            /></label>
          </div>
        }
        <label
          >Adresse e-mail<input
            type="email"
            name="email"
            [(ngModel)]="email"
            required
            email
            maxlength="254"
            autocomplete="email" /></label
        ><label
          >Mot de passe<input
            type="password"
            name="password"
            [(ngModel)]="password"
            required
            [minlength]="register ? 12 : 1"
            maxlength="64"
            [autocomplete]="register ? 'new-password' : 'current-password'"
        /></label>
        @if (register) {
          <small
            >12 caractères minimum, 72 octets UTF-8 maximum. Votre compte sera
            un compte participant.</small
          >
          <p class="muted">
            En créant un compte, vous prenez connaissance de notre
            <a routerLink="/privacy">politique de confidentialité</a>.
          </p>
        }
        <button class="wide" [disabled]="form.invalid || busy">
          {{
            busy
              ? "Un instant…"
              : register
                ? "Créer mon compte →"
                : "Se connecter →"
          }}
        </button>
      </form>
      <p class="auth-switch">
        {{ register ? "Déjà parmi nous ?" : "Pas encore de compte ?" }}
        <a [routerLink]="register ? '/login' : '/register'">{{
          register ? "Se connecter" : "Rejoindre Rassemble"
        }}</a>
      </p>
    </div>
  </section>`,
})
export class Auth {
  api = inject(Api);
  router = inject(Router);
  route = inject(ActivatedRoute);
  register = false;
  firstName = "";
  lastName = "";
  email = "";
  password = "";
  busy = false;
  constructor() {
    this.route.data.subscribe((data) => {
      this.register = !!data["register"];
      this.password = "";
      this.api.error.set("");
    });
  }
  submit() {
    this.busy = true;
    if (this.register) {
      this.api
        .request("POST", "/auth/register", {
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          password: this.password,
        })
        .subscribe({
          next: () => {
            this.password = "";
            this.api.message("Compte créé. Vous pouvez vous connecter.");
            this.router.navigateByUrl("/login");
          },
          error: () => (this.busy = false),
        });
    } else
      this.api.login(this.email, this.password).subscribe({
        next: () => {
          this.password = "";
          this.router.navigateByUrl("/dashboard");
        },
        error: () => (this.busy = false),
      });
  }
}
