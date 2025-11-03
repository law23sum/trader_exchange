package com.tradeexchange.config;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaInit {
  private final JdbcTemplate jdbc;
  public SchemaInit(JdbcTemplate jdbc){ this.jdbc = jdbc; }

  @PostConstruct
  public void init(){
    // Minimal tables used by the app. Existing DBs are respected.
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, providerPlayerId TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT, role TEXT, rating REAL, jobs INTEGER, bio TEXT, location TEXT, website TEXT, phone TEXT, specialties TEXT, hourlyRate REAL, availability TEXT, experienceYears INTEGER, languages TEXT, certifications TEXT, socialTwitter TEXT, socialInstagram TEXT, portfolio TEXT, sessionLength TEXT, editedPhotos INTEGER, delivery TEXT, turnaround TEXT, onLocation INTEGER, studioAvailable INTEGER, travelRadius TEXT, styles TEXT, equipment TEXT, createdAt TEXT, updatedAt TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, title TEXT, description TEXT, price REAL, providerId TEXT, status TEXT, createdAt TEXT, tags TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, kind TEXT, title TEXT, createdAt TEXT, lastMessage TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversationId TEXT, userId TEXT, role TEXT, content TEXT, createdAt TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, userName TEXT, service TEXT, status TEXT, amount REAL, createdAt TEXT, providerId TEXT, listingId TEXT, conversationId TEXT, reqDetails TEXT, reqDate TEXT, reqTime TEXT, reqAck INTEGER)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS provider_reviews (id TEXT PRIMARY KEY, providerId TEXT, author TEXT, rating INTEGER, text TEXT, at TEXT)"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS favorites (userId TEXT NOT NULL REFERENCES users(id), providerId TEXT NOT NULL REFERENCES players(id), PRIMARY KEY (userId, providerId))"); }catch(Exception ignore){}
    try{ jdbc.execute("CREATE TABLE IF NOT EXISTS interactions (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), providerId TEXT NOT NULL REFERENCES players(id), listingId TEXT, at TEXT NOT NULL, note TEXT DEFAULT '', amount REAL DEFAULT 0)"); }catch(Exception ignore){}
    // Case-insensitive unique email constraint via index
    try{ jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email))"); }catch(Exception ignore){}
  }
}
