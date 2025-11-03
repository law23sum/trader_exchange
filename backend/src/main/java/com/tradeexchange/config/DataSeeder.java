package com.tradeexchange.config;

import com.tradeexchange.common.PasswordService;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Collections;


@Component
@DependsOn({"schemaInit","databaseSchemaInitializer"})
public class DataSeeder {
  private final JdbcTemplate jdbc;
  private final PasswordService passwords;
  public DataSeeder(JdbcTemplate jdbc, PasswordService passwords){
    this.jdbc = jdbc;
    this.passwords = passwords;
  }

  private static final String[] PLAYER_COLUMN_ARRAY = {
    "id","name","role","rating","jobs","bio","location","website","phone",
    "specialties","hourlyRate","availability","experienceYears","languages","certifications",
    "socialTwitter","socialInstagram","portfolio","sessionLength","editedPhotos","delivery",
    "turnaround","onLocation","studioAvailable","travelRadius","styles","equipment","createdAt","updatedAt"
  };

  private static final String PLAYER_COLUMNS = String.join(",", PLAYER_COLUMN_ARRAY);
  private static final String PLAYER_VALUES = String.join(",", Collections.nCopies(PLAYER_COLUMN_ARRAY.length, "?"));
  private static final String PLAYER_INSERT = "INSERT OR IGNORE INTO players (" + PLAYER_COLUMNS + ") VALUES (" + PLAYER_VALUES + ")";

  @PostConstruct
  public void seedDemoData(){
    cleanLegacyMessaging();
    ensurePlayers();
    ensureListings();
    ensureUsers();
  }

  private void cleanLegacyMessaging(){
    try { jdbc.update("DELETE FROM messages WHERE role = 'assistant'"); } catch (Exception ignored) {}
    try { jdbc.update("DELETE FROM conversations WHERE kind = 'AI' OR title = 'AI Chat'"); } catch (Exception ignored) {}
    try {
      jdbc.update("DELETE FROM messages WHERE role = 'system' AND conversationId NOT IN (SELECT conversationId FROM messages WHERE role <> 'system')");
    } catch (Exception ignored) {}
    try {
      jdbc.update("DELETE FROM conversations WHERE id NOT IN (SELECT DISTINCT conversationId FROM messages)");
    } catch (Exception ignored) {}
    try {
      jdbc.update("""
        UPDATE conversations
        SET lastMessage = COALESCE((
          SELECT content FROM messages
          WHERE conversationId = conversations.id AND role <> 'system'
          ORDER BY createdAt DESC
          LIMIT 1
        ), '')
      """);
    } catch (Exception ignored) {}
  }

  private void ensurePlayers(){
    try {
      Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM players WHERE id IN (?,?,?)", Integer.class, "p_ava", "p_milo", "p_morgan");
      if (count != null && count == 3) return;
    } catch (Exception ignored) {}
    insertPlayers();
  }

  private void insertPlayers(){
    String now = Instant.now().toString();

    jdbc.update(PLAYER_INSERT,
      "p_ava","Ava Provider","PROVIDER",4.8,124,
      "Neighborhood lawn care specialist keeping yards spotless and sustainable.",
      "Austin, TX","https://ava-greens.example.com","+1 (512) 555-0111",
      "Lawn care,Garden upkeep,Seasonal cleanups",55,"Mon-Fri 8am-5pm",6,
      "English,Spanish","Licensed & insured","https://twitter.com/ava_greens","https://instagram.com/ava.greens","https://ava-greens.example.com/portfolio","90 minutes",0,
      "Weekly maintenance report","Same-week scheduling",1,0,"15 miles",
      "Residential lawns,Sustainable landscaping","Commercial mower,Edgers,Leaf blowers",
      now, now
    );

    jdbc.update(PLAYER_INSERT,
      "p_milo","Milo Provider","PROVIDER",4.6,58,
      "STEM tutor helping high-school students gain confidence in mathematics.",
      "New York, NY","https://milotutors.example.com","+1 (917) 555-0142",
      "Algebra,Geometry,Test prep",70,"Tue-Sat evenings",4,
      "English","Certified classroom teacher","https://twitter.com/milotutors","",
      "https://milotutors.example.com/results","60 minutes",0,
      "Progress summary after each lesson","Sessions can start within 48 hours",0,0,"",
      "Friendly coaching,Concept breakdowns","Virtual whiteboard,Practice problem bank",
      now, now
    );

    jdbc.update(PLAYER_INSERT,
      "p_morgan","Morgan Harper","PROVIDER",4.9,212,
      "Lifestyle photographer capturing candid stories for athletes and creatives.",
      "Portland, OR","https://harperstudio.example.com","+1 (971) 555-0184",
      "Lifestyle photography,Brand storytelling,Action portraits",120,"Mon-Sat 9am-7pm",8,
      "English,French","PPA Certified Professional Photographer","https://twitter.com/harperstudio","https://instagram.com/harper.studio",
      "https://harperstudio.example.com/gallery","2 hours",25,
      "Private gallery + print store","5 business days",1,1,"60 miles (travel fee after 30)",
      "Documentary,Editorial,Natural light","Dual mirrorless bodies,Prime lenses,Strobe kit",
      now, now
    );
  }

  private void ensureListings(){
    try {
      Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM listings WHERE id IN (?,?,?,?)", Integer.class, "lawn-care-basic", "portrait-mini", "algebra-60", "lifestyle-story-session");
      if (count != null && count == 4) return;
    } catch (Exception ignored) {}
    insertListings();
  }

  private void insertListings(){
    String now = Instant.now().toString();
    jdbc.update("INSERT OR IGNORE INTO listings (id,title,description,price,providerId,status,createdAt,tags) VALUES (?,?,?,?,?,?,?,?)",
      "lawn-care-basic","Lawn Care - quarter acre",
      "Mow, trim, edge, and haul clippings. Includes seasonal fertilization guidance.",
      85,"p_ava","LISTED",now,"home,outdoor,weekly,lawn,mow"
    );
    jdbc.update("INSERT OR IGNORE INTO listings (id,title,description,price,providerId,status,createdAt,tags) VALUES (?,?,?,?,?,?,?,?)",
      "portrait-mini","Portrait Session - 1 hour",
      "Natural light portraits with 10 edited photos and posing guidance.",
      220,"p_morgan","LISTED",now,"photo,creative,portrait,camera"
    );
    jdbc.update("INSERT OR IGNORE INTO listings (id,title,description,price,providerId,status,createdAt,tags) VALUES (?,?,?,?,?,?,?,?)",
      "algebra-60","Algebra Tutoring - 60 min",
      "One-on-one algebra support via video or in person with targeted practice sets.",
      45,"p_milo","LISTED",now,"education,tutor,math,algebra"
    );
    jdbc.update("INSERT OR IGNORE INTO listings (id,title,description,price,providerId,status,createdAt,tags) VALUES (?,?,?,?,?,?,?,?)",
      "lifestyle-story-session","Lifestyle Story Session - 2 hours",
      "Pre-shoot planning call, two-hour on-location session, 25 fully edited images, and social-ready clips.",
      525,"p_morgan","LISTED",now,"photo,creative,lifestyle,brand,storytelling"
    );
  }

  private void ensureUsers(){
    try {
      Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE email IN (?,?,?,?)", Integer.class,
        "user@example.com", "trader@example.com", "milo@tradeexchange.com", "admin@example.com");
      if (count != null && count == 4) return;
    } catch (Exception ignored) {}
    insertUsers();
  }

  private void insertUsers(){
    String now = Instant.now().toString();
    String userHash = passwords.hashPassword("password");
    String traderHash = passwords.hashPassword("password");
    String miloHash = passwords.hashPassword("password");
    String adminHash = passwords.hashPassword("password");
    jdbc.update("INSERT OR IGNORE INTO users (id,name,email,password,role,createdAt,providerPlayerId) VALUES (?,?,?,?,?,?,?)",
      "u_demo","Demo User","user@example.com",userHash,"USER",now,null
    );
    jdbc.update("INSERT OR IGNORE INTO users (id,name,email,password,role,createdAt,providerPlayerId) VALUES (?,?,?,?,?,?,?)",
      "u_morgan","Morgan Harper","trader@example.com",traderHash,"TRADER",now,"p_morgan"
    );
    jdbc.update("INSERT OR IGNORE INTO users (id,name,email,password,role,createdAt,providerPlayerId) VALUES (?,?,?,?,?,?,?)",
      "u_milo","Milo Provider","milo@tradeexchange.com",miloHash,"TRADER",now,"p_milo"
    );
    jdbc.update("INSERT OR IGNORE INTO users (id,name,email,password,role,createdAt,providerPlayerId) VALUES (?,?,?,?,?,?,?)",
      "u_admin","Admin","admin@example.com",adminHash,"ADMIN",now,null
    );
  }
}
