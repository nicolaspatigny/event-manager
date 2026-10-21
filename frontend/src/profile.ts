import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Api, User } from "./api";
@Component({
  standalone: true,
  imports: [FormsModule],
  template: ` <p class="eyebrow">MON COMPTE</p>
    <h1>À votre image<span class="accent">.</span></h1>
    <div class="two-cols">
      <section class="panel">
        <h2>Mes informations</h2>
        <p class="muted">{{ api.user()?.email }}</p>
        <form (ngSubmit)="save()" #profile="ngForm">
          <label
            >Prénom<input
              name="firstName"
              [(ngModel)]="firstName"
              required
              maxlength="80" /></label
          ><label
            >Nom<input
              name="lastName"
              [(ngModel)]="lastName"
              required
              maxlength="80" /></label
          ><button [disabled]="profile.invalid">Enregistrer</button>
        </form>
      </section>
      <section class="panel">
        <h2>Changer mon mot de passe</h2>
        <form (ngSubmit)="changePassword()" #passwordForm="ngForm">
          <label
            >Mot de passe actuel<input
              type="password"
              name="currentPassword"
              [(ngModel)]="currentPassword"
              required
              maxlength="64"
              autocomplete="current-password" /></label
          ><label
            >Nouveau mot de passe<input
              type="password"
              name="newPassword"
              [(ngModel)]="newPassword"
              required
              minlength="12"
              maxlength="64"
              autocomplete="new-password"
          /></label>
          <p class="muted">Vous devrez vous reconnecter après ce changement.</p>
          <button [disabled]="passwordForm.invalid">
            Changer le mot de passe
          </button>
        </form>
      </section>
    </div>
    <section class="panel privacy-panel">
      <h2>Vos données vous appartiennent.</h2>
      <p>
        Exportez vos informations et vos inscriptions. La suppression du compte
        retire vos informations personnelles et vos inscriptions. Les événements
        déjà publiés restent dans l’agenda sans vos coordonnées.
      </p>
      <div class="actions">
        <button class="secondary" (click)="export()">
          Télécharger mes données</button
        ><button class="danger" (click)="remove()">Supprimer mon compte</button>
      </div>
    </section>`,
})
export class Profile {
  api = inject(Api);
  router = inject(Router);
  firstName = this.api.user()?.firstName || "";
  lastName = this.api.user()?.lastName || "";
  currentPassword = "";
  newPassword = "";
  save() {
    this.api
      .request("PUT", "/me", {
        firstName: this.firstName,
        lastName: this.lastName,
      })
      .subscribe({
        next: () =>
          this.api.request<User>("GET", "/me").subscribe({
            next: (u) => {
              this.api.user.set(u);
              this.api.message("Profil enregistré.");
            },
            error: () => {},
          }),
        error: () => {},
      });
  }
  changePassword() {
    this.api
      .request("PUT", "/me/password", {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.api.clear();
          this.currentPassword = "";
          this.newPassword = "";
          this.api.message("Mot de passe modifié. Reconnectez-vous.");
          this.router.navigateByUrl("/login");
        },
        error: () => {},
      });
  }
  export() {
    this.api.request("GET", "/me/export").subscribe({
      next: (data) => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "mes-donnees-rassemble.json";
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }
  remove() {
    if (
      !confirm(
        "Supprimer définitivement votre compte et vos inscriptions ? Cette action est irréversible.",
      )
    )
      return;
    this.api.request("DELETE", "/me").subscribe({
      next: () => {
        this.api.clear();
        this.router.navigateByUrl("/");
        this.api.message("Votre compte a été supprimé.");
      },
      error: () => {},
    });
  }
}
@Component({
  standalone: true,
  template: `<article class="narrow panel">
    <p class="eyebrow">TRANSPARENCE</p>
    <h1>Confidentialité</h1>
    <p>
      Rassemble est un projet pédagogique de remplacement de stage. Cette
      instance de démonstration doit être utilisée avec des données fictives.
    </p>
    <h2>Quelles données ?</h2>
    <p>
      Nom, prénom, adresse e-mail, mot de passe haché et inscriptions sont
      nécessaires pour gérer votre compte et vos participations. Les
      organisateurs voient le nom des participants à leurs événements ; les
      administrateurs gèrent les comptes.
    </p>
    <h2>Utilisation et conservation</h2>
    <p>
      Les données de compte sont utilisées pour le service demandé. Un journal
      technique minimal permet de suivre les actions importantes ; ses entrées
      expirent après 90 jours. Aucun traceur publicitaire ni cookie de connexion
      n’est utilisé. Le jeton de connexion reste uniquement en mémoire et
      disparaît en rechargeant la page.
    </p>
    <h2>Vos droits</h2>
    <p>
      Dans « Mon profil », vous pouvez corriger votre nom, exporter vos données
      ou supprimer votre compte. Annulez vos événements à venir avant une
      suppression. La suppression retire le profil, les inscriptions et les
      journaux associés ; les événements restent sans vos coordonnées
      personnelles.
    </p>
    <h2>Avant une ouverture au public</h2>
    <p>
      Le responsable du traitement, son contact, l’hébergeur, les durées de
      conservation métier et la procédure de réponse aux demandes doivent être
      définis et publiés par l’exploitant. Ce prototype n’établit pas à lui seul
      une conformité juridique.
    </p>
  </article>`,
})
export class Privacy {}
