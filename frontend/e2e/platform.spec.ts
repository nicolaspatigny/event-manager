import { test, expect, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const password = "browser-test-password-123";
const suffix = Date.now().toString();
let organizerEmail = "organizer-" + suffix + "@example.test";
let participantEmail = "participant-" + suffix + "@example.test";
let categoryId: string, eventId: string;
const title = "Atelier des rencontres " + suffix;
async function login(page: Page, email: string, pw = password) {
  await page.getByRole("link", { name: "Connexion", exact: true }).click();
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(
    page.getByRole("link", { name: "Connexion", exact: true }),
  ).toBeVisible();
}
async function shot(page: Page, name: string) {
  await mkdir("../artifacts/screenshots", { recursive: true });
  await page.screenshot({
    path: "../artifacts/screenshots/" + name + ".png",
    fullPage: true,
  });
}
test.beforeAll(async ({ request }) => {
  const base = "http://127.0.0.1:8080/api";
  const admin = await request.post(base + "/auth/login", {
    data: {
      email: "e2e-admin@example.test",
      password: "e2e-only-password-123",
    },
  });
  expect(admin.status()).toBe(200);
  const adminToken = (await admin.json()).token;
  for (const email of [organizerEmail, participantEmail]) {
    const registration = await request.post(base + "/auth/register", {
      data: {
        firstName: email === organizerEmail ? "Camille" : "Alex",
        lastName: "Démonstration",
        email,
        password,
      },
    });
    expect(registration.status()).toBe(201);
    if (email === organizerEmail) {
      const user = await registration.json();
      const promotion = await request.put(base + "/admin/users/" + user.id, {
        headers: { Authorization: "Bearer " + adminToken },
        data: { role: "ORGANIZER", disabled: false },
      });
      expect(promotion.status()).toBe(204);
    }
  }
  const category = await request.post(base + "/admin/categories", {
    headers: { Authorization: "Bearer " + adminToken },
    data: { name: "Créativité " + suffix, active: true },
  });
  expect(category.status()).toBe(201);
  categoryId = (await category.json()).id;
  const org = await request.post(base + "/auth/login", {
    data: { email: organizerEmail, password },
  });
  const orgToken = (await org.json()).token;
  const event = await request.post(base + "/events", {
    headers: { Authorization: "Bearer " + orgToken },
    data: {
      title,
      description:
        "Un atelier convivial pour partager ses idées et rencontrer de nouvelles personnes.",
      startsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      location: "Maison des associations, Nantes",
      categoryId,
      capacity: 12,
      revision: 0,
    },
  });
  expect(event.status()).toBe(201);
  eventId = (await event.json()).id;
});
test("public catalogue, filters, detail and mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Les belles rencontres/ }),
  ).toBeVisible();
  await page
    .getByLabel("Rechercher", { exact: true })
    .fill("Atelier des rencontres");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await shot(page, "01-agenda-desktop");
  await page.getByRole("heading", { name: title, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Se connecter pour participer" }),
  ).toBeVisible();
  await shot(page, "02-event-detail");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Tous les événements" }).click();
  await shot(page, "03-agenda-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("participant registration, booking, profile export and cancellation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Nous rejoindre" }).click();
  const email = "new-" + suffix + "@example.test";
  await page.getByLabel("Prénom", { exact: true }).fill("Lou");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("link", { name: "L’agenda", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).click();
  await page.getByRole("button", { name: "Réserver ma place" }).click();
  await expect(
    page.getByText("Vous êtes inscrit à cet événement."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Mon espace", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await shot(page, "04-participant-dashboard");
  await page.getByRole("link", { name: "Mon profil", exact: true }).click();
  await page.getByLabel("Prénom", { exact: true }).fill("Lou modifié");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profil enregistré");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger mes données" }).click();
  expect((await download).suggestedFilename()).toBe(
    "mes-donnees-rassemble.json",
  );
  await page.getByRole("link", { name: "Mon espace", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Annuler mon inscription" }).click();
  await expect(
    page.getByRole("button", { name: "Réserver ma place" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Mon profil", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(
    page.getByRole("link", { name: "Connexion", exact: true }),
  ).toBeVisible();
});
test("organizer publishes, edits, views roster and cancels an event", async ({
  page,
}) => {
  await page.goto("/");
  await login(page, organizerEmail);
  await page.getByRole("link", { name: "Organiser", exact: true }).click();
  await page.getByRole("link", { name: "Créer un événement" }).click();
  await page
    .getByLabel("Titre", { exact: true })
    .fill("Rencontre publiée depuis Angular");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "Un événement créé dans le navigateur pour vérifier le parcours complet.",
    );
  await page
    .getByLabel("Date et heure")
    .fill(new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 16));
  await page.getByLabel("Capacité", { exact: true }).fill("8");
  await page.getByLabel("Lieu", { exact: true }).fill("Nantes");
  await page.getByLabel("Catégorie", { exact: true }).selectOption(categoryId);
  await page.getByRole("button", { name: "Publier l’événement" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Rencontre publiée depuis Angular",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Modifier l’événement" }).click();
  await page.getByLabel("Capacité", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(page.getByText("0 / 10 participants")).toBeVisible();
  await page.getByRole("button", { name: "Voir les participants" }).click();
  await expect(page.getByText("Aucune inscription.")).toBeVisible();
  await shot(page, "05-organizer-event");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Annuler l’événement", exact: true })
    .click();
  await expect(page.getByText("Annulé", { exact: true })).toBeVisible();
  await logout(page);
});
test("administrator manages categories, accounts and audit log", async ({
  page,
}) => {
  await page.goto("/");
  await login(page, "e2e-admin@example.test", "e2e-only-password-123");
  await page.getByRole("link", { name: "Administration", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Comptes & autorisations" }),
  ).toBeVisible();
  await shot(page, "06-administration");
  await page.getByRole("button", { name: "Catégories", exact: true }).click();
  await page
    .getByLabel("Nouvelle catégorie")
    .fill("Sport navigateur " + suffix);
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(
    page.getByRole("textbox", {
      name: "Nom de la catégorie Sport navigateur " + suffix,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Journal d’activité" }).click();
  await expect(
    page.getByRole("cell", { name: "EVENT_CREATED", exact: true }).first(),
  ).toBeVisible();
  await shot(page, "07-audit");
  await page.getByRole("button", { name: "Événements", exact: true }).click();
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toBeVisible();
});
