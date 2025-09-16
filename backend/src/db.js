let Database = null;
try {
  ({ default: Database } = await import('better-sqlite3'))
} catch {}

let db = { available:false };
if (Database) {
  db = new Database("./trade.db");
  db.available = true;
}

const schema = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('PROVIDER','SEEKER')) NOT NULL,
  rating REAL DEFAULT 5.0,
  jobs INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  providerId TEXT NOT NULL REFERENCES players(id),
  status TEXT NOT NULL,
  seekerId TEXT REFERENCES players(id),
  escrowTx TEXT,
  createdAt TEXT NOT NULL,
  tags TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  type TEXT NOT NULL,
  actorId TEXT,
  listingId TEXT,
  note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('USER','TRADER')) NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (
  userId TEXT NOT NULL REFERENCES users(id),
  providerId TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (userId, providerId)
);
CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  providerId TEXT NOT NULL REFERENCES players(id),
  listingId TEXT,
  at TEXT NOT NULL,
  note TEXT DEFAULT ''
);

-- Messaging
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  kind TEXT DEFAULT 'AI',
  title TEXT DEFAULT '',
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conversation_members (
  conversationId TEXT NOT NULL REFERENCES conversations(id),
  userId TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (conversationId, userId)
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL REFERENCES conversations(id),
  userId TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

`;
try { if (db.available) db.exec(schema); } catch {}

function hasColumn(table, column){
  try{
    if (!db.available) return false;
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.some(r => r.name === column);
  }catch{ return false }
}

try {
  if (!db.available) throw new Error('no db');
  if (!hasColumn('users','providerPlayerId')) {
    db.exec(`ALTER TABLE users ADD COLUMN providerPlayerId TEXT`);
  }
} catch {}

try {
  if (!db.available) throw new Error('no db');
  if (!hasColumn('players','bio')) {
    db.exec(`ALTER TABLE players ADD COLUMN bio TEXT DEFAULT ''`);
  }
} catch {}
try { if (db.available && !hasColumn('players','location')) { db.exec(`ALTER TABLE players ADD COLUMN location TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','website')) { db.exec(`ALTER TABLE players ADD COLUMN website TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','phone')) { db.exec(`ALTER TABLE players ADD COLUMN phone TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','specialties')) { db.exec(`ALTER TABLE players ADD COLUMN specialties TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','hourlyRate')) { db.exec(`ALTER TABLE players ADD COLUMN hourlyRate REAL DEFAULT 0`); } } catch {}
try { if (db.available && !hasColumn('players','availability')) { db.exec(`ALTER TABLE players ADD COLUMN availability TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','experienceYears')) { db.exec(`ALTER TABLE players ADD COLUMN experienceYears INTEGER DEFAULT 0`); } } catch {}
try { if (db.available && !hasColumn('players','languages')) { db.exec(`ALTER TABLE players ADD COLUMN languages TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','certifications')) { db.exec(`ALTER TABLE players ADD COLUMN certifications TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','socialTwitter')) { db.exec(`ALTER TABLE players ADD COLUMN socialTwitter TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','socialInstagram')) { db.exec(`ALTER TABLE players ADD COLUMN socialInstagram TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','portfolio')) { db.exec(`ALTER TABLE players ADD COLUMN portfolio TEXT DEFAULT ''`); } } catch {}
// Portrait Session specific details
try { if (db.available && !hasColumn('players','sessionLength')) { db.exec(`ALTER TABLE players ADD COLUMN sessionLength TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','editedPhotos')) { db.exec(`ALTER TABLE players ADD COLUMN editedPhotos INTEGER DEFAULT 0`); } } catch {}
try { if (db.available && !hasColumn('players','delivery')) { db.exec(`ALTER TABLE players ADD COLUMN delivery TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','turnaround')) { db.exec(`ALTER TABLE players ADD COLUMN turnaround TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','onLocation')) { db.exec(`ALTER TABLE players ADD COLUMN onLocation INTEGER DEFAULT 1`); } } catch {}
try { if (db.available && !hasColumn('players','studioAvailable')) { db.exec(`ALTER TABLE players ADD COLUMN studioAvailable INTEGER DEFAULT 0`); } } catch {}
try { if (db.available && !hasColumn('players','travelRadius')) { db.exec(`ALTER TABLE players ADD COLUMN travelRadius TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','styles')) { db.exec(`ALTER TABLE players ADD COLUMN styles TEXT DEFAULT ''`); } } catch {}
try { if (db.available && !hasColumn('players','equipment')) { db.exec(`ALTER TABLE players ADD COLUMN equipment TEXT DEFAULT ''`); } } catch {}

try {
  if (db.available && !hasColumn('interactions','amount')) {
    db.exec(`ALTER TABLE interactions ADD COLUMN amount REAL DEFAULT 0`);
  }
} catch {}

// Ensure conversations have kind/title columns for older DBs
try {
  if (db.available && !hasColumn('conversations','kind')) {
    db.exec(`ALTER TABLE conversations ADD COLUMN kind TEXT DEFAULT 'AI'`);
  }
} catch {}
try {
  if (db.available && !hasColumn('conversations','title')) {
    db.exec(`ALTER TABLE conversations ADD COLUMN title TEXT DEFAULT ''`);
  }
} catch {}

// Enforce case-insensitive uniqueness for user emails (if no duplicates exist)
try {
  if (db.available) db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email))`);
} catch {}

export default db;
