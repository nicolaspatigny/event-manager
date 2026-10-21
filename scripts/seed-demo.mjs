// Optional fictitious demonstration data. Credentials are supplied by the operator.
const base = process.env.API_URL || "http://127.0.0.1:8081/api";
for (const key of ["ADMIN_EMAIL", "ADMIN_PASSWORD", "DEMO_PASSWORD"]) {
  if (!process.env[key])
    throw new Error(`Supply ${key}; no default credentials are provided.`);
}
async function api(method, path, body, token, allowed = [200, 201, 204]) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!allowed.includes(response.status))
    throw new Error(`${method} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
const admin = await api("POST", "/auth/login", {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});
let categories = await api("GET", "/categories");
for (const name of ["Ateliers", "Culture", "Sport", "Rencontres"]) {
  if (!categories.some((c) => c.name === name))
    categories.push(
      await api(
        "POST",
        "/admin/categories",
        { name, active: true },
        admin.token,
      ),
    );
}
const emails = ["organisateur@demo.example", "participant@demo.example"];
for (const [index, email] of emails.entries()) {
  await api(
    "POST",
    "/auth/register",
    {
      firstName: index === 0 ? "Camille" : "Alex",
      lastName: "Démonstration",
      email,
      password: process.env.DEMO_PASSWORD,
    },
    undefined,
    [201, 409],
  );
}
let organizer;
for (let page = 0; page < 100; page++) {
  const users = await api(
    "GET",
    `/admin/users?size=100&page=${page}`,
    undefined,
    admin.token,
  );
  organizer = users.items.find((u) => u.email === emails[0]);
  if (organizer) break;
  if ((page + 1) * 100 >= users.total) break;
}
if (!organizer) throw new Error("Demonstration organizer not found");
if (organizer.role !== "ORGANIZER")
  await api(
    "PUT",
    "/admin/users/" + organizer.id,
    { role: "ORGANIZER", disabled: false },
    admin.token,
  );
const org = await api("POST", "/auth/login", {
  email: emails[0],
  password: process.env.DEMO_PASSWORD,
});
const existing = await api(
  "GET",
  "/events?scope=mine&size=100",
  undefined,
  org.token,
);
const definitions = [
  [
    "Les mains dans la terre",
    "Ateliers",
    "Maison des arts · Nantes",
    "Découvrez le modelage de l’argile dans un atelier convivial. Aucun matériel ni expérience nécessaires : venez avec votre curiosité.",
    18,
    3,
  ],
  [
    "La ville à travers l’objectif",
    "Culture",
    "Île de Nantes",
    "Une promenade photo pour poser un regard nouveau sur les détails du quotidien. Téléphone ou appareil photo bienvenus.",
    16,
    6,
  ],
  [
    "Un dimanche au grand air",
    "Sport",
    "Parc de Procé · Nantes",
    "Une marche douce, des rencontres et une pause au vert. Un moment accessible pour prendre le temps de se retrouver.",
    30,
    9,
  ],
  [
    "Des idées autour d’un café",
    "Rencontres",
    "Café des voisins · Nantes",
    "Un café, une idée et des personnes pour en parler. Partagez vos projets et découvrez ceux de votre quartier.",
    12,
    12,
  ],
  [
    "Une soirée, de nouveaux sons",
    "Culture",
    "Studio collectif · Nantes",
    "Écoutez, échangez et découvrez une sélection musicale imaginée par des passionnés. Une soirée pour élargir ses horizons.",
    25,
    16,
  ],
  [
    "Le goût du fait maison",
    "Ateliers",
    "Cuisine partagée · Nantes",
    "Préparez ensemble des recettes simples et de saison, puis partagez le repas. Signalez vos contraintes alimentaires à l’organisateur avant la séance.",
    10,
    20,
  ],
];
for (const [
  title,
  category,
  location,
  description,
  capacity,
  days,
] of definitions) {
  if (existing.items.some((e) => e.title === title)) continue;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + Number(days));
  start.setUTCHours(17, 0, 0, 0);
  await api(
    "POST",
    "/events",
    {
      title,
      description,
      location,
      categoryId: categories.find((c) => c.name === category).id,
      capacity,
      startsAt: start.toISOString(),
      revision: 0,
    },
    org.token,
  );
}
console.log(
  "Fictitious categories, six events and two demonstration accounts prepared. No password or token printed.",
);
