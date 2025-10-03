package com.tradeexchange.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class PublicController {

  private final JdbcTemplate jdbc;
  public PublicController(JdbcTemplate jdbc){ this.jdbc = jdbc; }

  @GetMapping("/categories")
  public ResponseEntity<?> categories(){
    try{
      var rows = jdbc.query("SELECT tags FROM listings WHERE tags IS NOT NULL AND TRIM(tags)<>''", rs -> {
        java.util.Set<String> set = new java.util.HashSet<>();
        while (rs.next()){
          String tags = rs.getString(1);
          if (tags!=null){ for (String t : tags.split(",")){ String v=t.trim(); if (!v.isEmpty()) set.add(v); } }
        }
        return new java.util.ArrayList<>(set);
      });
      return ResponseEntity.ok(rows);
    }catch(Exception e){ return ResponseEntity.ok(java.util.List.of()); }
  }

  // Simple search across providers and listings by name/title/description/tags
  @GetMapping("/search")
  public ResponseEntity<?> search(@RequestParam(value = "q", required = false) String q){
    String query = q == null ? "" : q.trim().toLowerCase();
    try{
      // Providers
      var providers = jdbc.query("SELECT id,name,role,rating,jobs,location,hourlyRate,bio FROM players", rs -> {
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        while (rs.next()){
          String name = rs.getString("name");
          String bio = rs.getString("bio");
          String hay = ((name==null?"":name) + " " + (bio==null?"":bio)).toLowerCase();
          if (query.isEmpty() || hay.contains(query)){
            out.add(java.util.Map.of(
              "id", rs.getString("id"),
              "name", name,
              "role", rs.getString("role"),
              "rating", java.util.Optional.ofNullable(rs.getObject("rating")).orElse(0),
              "jobs", java.util.Optional.ofNullable(rs.getObject("jobs")).orElse(0),
              "location", java.util.Optional.ofNullable(rs.getString("location")).orElse(""),
              "hourlyRate", java.util.Optional.ofNullable(rs.getObject("hourlyRate")).orElse(0),
              "bio", bio==null?"":bio
            ));
          }
        }
        return out;
      });
      // Listings
      var listings = jdbc.query("SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings", rs -> {
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        while (rs.next()){
          String title = rs.getString("title");
          String desc = rs.getString("description");
          String tags = rs.getString("tags");
          String hay = ((title==null?"":title) + " " + (desc==null?"":desc) + " " + (tags==null?"":tags)).toLowerCase();
          if (query.isEmpty() || hay.contains(query)){
            java.util.Map<String,Object> row = new java.util.LinkedHashMap<>();
            row.put("id", rs.getString("id"));
            row.put("title", title);
            row.put("description", desc==null?"":desc);
            row.put("price", java.util.Optional.ofNullable(rs.getObject("price")).orElse(0));
            row.put("providerId", rs.getString("providerId"));
            row.put("status", java.util.Optional.ofNullable(rs.getString("status")).orElse("LISTED"));
            row.put("createdAt", java.util.Optional.ofNullable(rs.getString("createdAt")).orElse(java.time.Instant.now().toString()));
            row.put("tags", tags==null?"":tags);
            out.add(row);
          }
        }
        return out;
      });
      return ResponseEntity.ok(java.util.Map.of("providers", providers, "listings", listings));
    }catch(Exception e){
      return ResponseEntity.ok(java.util.Map.of("providers", java.util.List.of(), "listings", java.util.List.of()));
    }
  }

  @GetMapping("/players")
  public ResponseEntity<?> players(){
    try{
      List<Map<String,Object>> rows = jdbc.query("SELECT id,name,role,rating,jobs,location,hourlyRate,bio FROM players",
        rs -> {
          List<Map<String,Object>> out = new ArrayList<>();
          while (rs.next()){
            out.add(Map.of(
              "id", rs.getString("id"),
              "name", rs.getString("name"),
              "role", rs.getString("role"),
              "rating", Optional.ofNullable(rs.getObject("rating")).orElse(0),
              "jobs", Optional.ofNullable(rs.getObject("jobs")).orElse(0),
              "location", Optional.ofNullable(rs.getString("location")).orElse(""),
              "hourlyRate", Optional.ofNullable(rs.getObject("hourlyRate")).orElse(0),
              "bio", Optional.ofNullable(rs.getString("bio")).orElse("")
            ));
          }
          return out;
        });
      return ResponseEntity.ok(rows);
    }catch(Exception e){ return ResponseEntity.ok(List.of()); }
  }

  @GetMapping("/listings")
  public ResponseEntity<?> listings(){
    try{
      List<Map<String,Object>> rows = jdbc.query("SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings",
        rs -> {
          List<Map<String,Object>> out = new ArrayList<>();
          while (rs.next()){
            out.add(Map.of(
              "id", rs.getString("id"),
              "title", rs.getString("title"),
              "description", Optional.ofNullable(rs.getString("description")).orElse(""),
              "price", Optional.ofNullable(rs.getObject("price")).orElse(0),
              "providerId", rs.getString("providerId"),
              "status", Optional.ofNullable(rs.getString("status")).orElse("LISTED"),
              "createdAt", Optional.ofNullable(rs.getString("createdAt")).orElse(Instant.now().toString()),
              "tags", Optional.ofNullable(rs.getString("tags")).orElse("")
            ));
          }
          return out;
        });
      return ResponseEntity.ok(rows);
    }catch(Exception e){ return ResponseEntity.ok(List.of()); }
  }

  @GetMapping("/providers/{id}")
  public ResponseEntity<?> provider(@PathVariable String id){
    try{
      Map<String,Object> provider = jdbc.query("SELECT * FROM players WHERE id=?", ps -> ps.setString(1,id), rs -> {
        if (!rs.next()) return null;
        Map<String,Object> p = new LinkedHashMap<>();
        p.put("id", rs.getString("id"));
        p.put("name", rs.getString("name"));
        p.put("role", rs.getString("role"));
        p.put("rating", Optional.ofNullable(rs.getObject("rating")).orElse(0));
        p.put("jobs", Optional.ofNullable(rs.getObject("jobs")).orElse(0));
        p.put("location", Optional.ofNullable(rs.getString("location")).orElse(""));
        p.put("hourlyRate", Optional.ofNullable(rs.getObject("hourlyRate")).orElse(0));
        p.put("bio", Optional.ofNullable(rs.getString("bio")).orElse(""));
        p.put("website", Optional.ofNullable(rs.getString("website")).orElse(""));
        p.put("phone", Optional.ofNullable(rs.getString("phone")).orElse(""));
        p.put("availability", Optional.ofNullable(rs.getString("availability")).orElse(""));
        return p;
      });
      if (provider == null) return ResponseEntity.status(404).body(Map.of("message","Not found"));
      List<Map<String,Object>> listings = jdbc.query("SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings WHERE providerId=?",
        ps -> ps.setString(1, id),
        rs -> {
          List<Map<String,Object>> out = new ArrayList<>();
          while (rs.next()){
            out.add(Map.of(
              "id", rs.getString("id"),
              "title", rs.getString("title"),
              "description", Optional.ofNullable(rs.getString("description")).orElse(""),
              "price", Optional.ofNullable(rs.getObject("price")).orElse(0),
              "providerId", rs.getString("providerId"),
              "status", Optional.ofNullable(rs.getString("status")).orElse("LISTED"),
              "createdAt", Optional.ofNullable(rs.getString("createdAt")).orElse(Instant.now().toString()),
              "tags", Optional.ofNullable(rs.getString("tags")).orElse("")
            ));
          }
          return out;
        });
      return ResponseEntity.ok(Map.of("provider", provider, "listings", listings));
    }catch(Exception e){ return ResponseEntity.status(404).body(Map.of("message","Not found")); }
  }

  @GetMapping("/providers/{id}/reviews")
  public ResponseEntity<?> listReviews(@PathVariable String id){
    var rows = jdbc.query("SELECT id,author,rating,text,at FROM provider_reviews WHERE providerId=? ORDER BY at DESC", ps -> ps.setString(1,id), rs -> {
      java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
      while (rs.next()){
        out.add(java.util.Map.of(
          "id", rs.getString(1),
          "author", rs.getString(2),
          "rating", rs.getInt(3),
          "text", rs.getString(4),
          "at", rs.getString(5)
        ));
      }
      return out;
    });
    return ResponseEntity.ok(rows);
  }
  public record NewReview(Integer rating, String text){}
  @PostMapping("/providers/{id}/reviews")
  public ResponseEntity<?> postReview(@PathVariable String id, @RequestBody NewReview req){
    String rid = UUID.randomUUID().toString().substring(0,8);
    int rating = Math.max(1, Math.min(5, java.util.Optional.ofNullable(req.rating()).orElse(0)));
    String text = java.util.Optional.ofNullable(req.text()).orElse("");
    String at = Instant.now().toString();
    jdbc.update("INSERT INTO provider_reviews (id,providerId,author,rating,text,at) VALUES (?,?,?,?,?,?)", rid, id, "Customer", rating, text, at);
    return ResponseEntity.ok(java.util.Map.of("ok", true, "review", java.util.Map.of("id", rid, "author","Customer","rating", rating, "text", text, "at", at)));
  }
}
