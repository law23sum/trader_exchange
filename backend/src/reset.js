import db from "./db.js";

if (!db?.available) {
  console.log("SQLite not available (better-sqlite3 not installed). Nothing to reset.");
  process.exit(0);
}

function reset() {
  const tables = [
    // child tables first (respecting FKs)
    "messages",
    "conversation_members",
    "conversations",
    "favorites",
    "interactions",
    "sessions",
    "listings",
    "players",
    "events",
    "users"
  ];

  const trx = db.transaction(() => {
    db.exec("PRAGMA foreign_keys=OFF;");
    for (const t of tables) {
      try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
    }
    db.exec("PRAGMA foreign_keys=ON;");
  });
  trx();

  try { db.exec("VACUUM;"); } catch {}
  console.log("All data deleted from database.");
}

reset();
