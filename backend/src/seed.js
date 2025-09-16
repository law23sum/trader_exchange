import db from "./db.js";
if (!db?.available) {
  console.log("SQLite not available (better-sqlite3 not installed). Skipping seed.");
  process.exit(0);
}
const run = db.transaction(() => {
  const uid = () => Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toISOString();
  db.prepare("DELETE FROM events").run();
  db.prepare("DELETE FROM listings").run();
  db.prepare("DELETE FROM players").run();
  const players = [
    { id: uid(), name: "Ava Provider", role: "PROVIDER", rating: 4.8, jobs: 124 },
    { id: uid(), name: "Milo Provider", role: "PROVIDER", rating: 4.6, jobs: 58 },
    { id: uid(), name: "Rae Seeker", role: "SEEKER", rating: 4.9, jobs: 41 },
    { id: uid(), name: "Kai Seeker", role: "SEEKER", rating: 4.7, jobs: 13 }
  ];
  const insP = db.prepare("INSERT INTO players (id,name,role,rating,jobs) VALUES (@id,@name,@role,@rating,@jobs)");
  for (const p of players) insP.run(p);
  const ava = players.find(p=>p.name.startsWith("Ava"));
  const milo = players.find(p=>p.name.startsWith("Milo"));
  const listings = [
    { id: uid(), title: "Lawn Care — quarter acre", description: "Mow, trim, and edge. Includes bagging and cleanup.", price: 85, providerId: ava.id, status: "LISTED", seekerId: null, escrowTx: null, createdAt: now(), tags: "home,outdoor,weekly,lawn,mow" },
    { id: uid(), title: "Portrait Session — 1 hour", description: "Natural light portraits. 10 edited photos included.", price: 220, providerId: milo.id, status: "LISTED", seekerId: null, escrowTx: null, createdAt: now(), tags: "photo,creative,portrait,camera" },
    { id: uid(), title: "Algebra Tutoring — 60 min", description: "One-on-one algebra lesson over video or in person.", price: 45, providerId: ava.id, status: "LISTED", seekerId: null, escrowTx: null, createdAt: now(), tags: "education,tutor,math,algebra" }
  ];
  const insL = db.prepare(`INSERT INTO listings (id,title,description,price,providerId,status,seekerId,escrowTx,createdAt,tags)
    VALUES (@id,@title,@description,@price,@providerId,@status,@seekerId,@escrowTx,@createdAt,@tags)`);
  for (const l of listings) insL.run(l);
  console.log("Seeded players and listings");
});
run();

/* Seed users */
const uid = () => Math.random().toString(36).slice(2,10);
const now = () => new Date().toISOString();
const users = [
  { id: uid(), name: "Demo User", email: "user@example.com", password: "password", role: "USER", createdAt: now() },
  { id: uid(), name: "Demo Trader", email: "trader@example.com", password: "password", role: "TRADER", createdAt: now() },
  { id: uid(), name: "Admin", email: "admin@example.com", password: "password", role: "ADMIN", createdAt: now() },
];
const insU = db.prepare("INSERT INTO users (id,name,email,password,role,createdAt) VALUES (@id,@name,@email,@password,@role,@createdAt)");
for (const u of users) insU.run(u);
console.log("Seeded users: user@example.com / trader@example.com (password: password)");

// Link trader@example.com to a provider
try {
  const trader = db.prepare("SELECT * FROM users WHERE email='trader@example.com'").get();
  if (trader && !trader.providerPlayerId) {
    const pid = Math.random().toString(36).slice(2,10);
    db.prepare("INSERT INTO players (id,name,role,rating,jobs,bio) VALUES (?,?,?,?,?,?)")
      .run(pid, "Demo Trader Provider", "PROVIDER", 4.9, 0, "");
    db.prepare("UPDATE users SET providerPlayerId=? WHERE id=?").run(pid, trader.id);
  }
} catch (e) {}
