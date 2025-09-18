package com.tradeexchange.config;

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSchemaInitializer {

  private final JdbcTemplate jdbc;

  public DatabaseSchemaInitializer(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @PostConstruct
  public void initialize(){
    ensureUserColumns();
    ensurePlayerColumns();
  }

  private boolean columnExists(String table, String column){
    try{
      var names = jdbc.query("PRAGMA table_info(" + table + ")", (rs, rowNum) -> rs.getString("name"));
      for (String name : names){
        if (name != null && name.equalsIgnoreCase(column)){
          return true;
        }
      }
    }catch(Exception ignored){
      return false;
    }
    return false;
  }

  private void ensureColumn(String table, String column, String ddl){
    if (columnExists(table, column)) return;
    try{
      jdbc.execute(ddl);
    }catch(Exception ignored){
    }
  }

  private void ensureUserColumns(){
    ensureColumn("users", "providerPlayerId", "ALTER TABLE users ADD COLUMN providerPlayerId TEXT");
    ensureColumn("users", "password", "ALTER TABLE users ADD COLUMN password TEXT DEFAULT ''");
    ensureColumn("users", "createdAt", "ALTER TABLE users ADD COLUMN createdAt TEXT DEFAULT ''");
  }

  private void ensurePlayerColumns(){
    ensureColumn("players", "bio", "ALTER TABLE players ADD COLUMN bio TEXT DEFAULT ''");
    ensureColumn("players", "location", "ALTER TABLE players ADD COLUMN location TEXT DEFAULT ''");
    ensureColumn("players", "website", "ALTER TABLE players ADD COLUMN website TEXT DEFAULT ''");
    ensureColumn("players", "phone", "ALTER TABLE players ADD COLUMN phone TEXT DEFAULT ''");
    ensureColumn("players", "specialties", "ALTER TABLE players ADD COLUMN specialties TEXT DEFAULT ''");
    ensureColumn("players", "hourlyRate", "ALTER TABLE players ADD COLUMN hourlyRate REAL DEFAULT 0");
    ensureColumn("players", "availability", "ALTER TABLE players ADD COLUMN availability TEXT DEFAULT ''");
    ensureColumn("players", "experienceYears", "ALTER TABLE players ADD COLUMN experienceYears INTEGER DEFAULT 0");
    ensureColumn("players", "languages", "ALTER TABLE players ADD COLUMN languages TEXT DEFAULT ''");
    ensureColumn("players", "certifications", "ALTER TABLE players ADD COLUMN certifications TEXT DEFAULT ''");
    ensureColumn("players", "socialTwitter", "ALTER TABLE players ADD COLUMN socialTwitter TEXT DEFAULT ''");
    ensureColumn("players", "socialInstagram", "ALTER TABLE players ADD COLUMN socialInstagram TEXT DEFAULT ''");
    ensureColumn("players", "portfolio", "ALTER TABLE players ADD COLUMN portfolio TEXT DEFAULT ''");
    ensureColumn("players", "sessionLength", "ALTER TABLE players ADD COLUMN sessionLength TEXT DEFAULT ''");
    ensureColumn("players", "editedPhotos", "ALTER TABLE players ADD COLUMN editedPhotos INTEGER DEFAULT 0");
    ensureColumn("players", "delivery", "ALTER TABLE players ADD COLUMN delivery TEXT DEFAULT ''");
    ensureColumn("players", "turnaround", "ALTER TABLE players ADD COLUMN turnaround TEXT DEFAULT ''");
    ensureColumn("players", "onLocation", "ALTER TABLE players ADD COLUMN onLocation INTEGER DEFAULT 1");
    ensureColumn("players", "studioAvailable", "ALTER TABLE players ADD COLUMN studioAvailable INTEGER DEFAULT 0");
    ensureColumn("players", "travelRadius", "ALTER TABLE players ADD COLUMN travelRadius TEXT DEFAULT ''");
    ensureColumn("players", "styles", "ALTER TABLE players ADD COLUMN styles TEXT DEFAULT ''");
    ensureColumn("players", "equipment", "ALTER TABLE players ADD COLUMN equipment TEXT DEFAULT ''");
  }
}

