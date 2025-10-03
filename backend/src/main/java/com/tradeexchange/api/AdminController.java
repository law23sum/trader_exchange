package com.tradeexchange.api;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
  private final JdbcTemplate jdbc;
  public AdminController(JdbcTemplate jdbc){ this.jdbc = jdbc; }

  @GetMapping("/users")
  public ResponseEntity<?> users(){
    try{
      var rows = jdbc.query("SELECT id,name,email,role,providerPlayerId FROM users", rs -> {
        java.util.List<java.util.Map<String,Object>> out = new java.util.ArrayList<>();
        while (rs.next()){
          java.util.Map<String,Object> m = new java.util.LinkedHashMap<>();
          m.put("id", rs.getString(1));
          m.put("name", rs.getString(2));
          m.put("email", rs.getString(3));
          m.put("role", rs.getString(4));
          m.put("providerId", rs.getString(5));
          out.add(m);
        }
        return out;
      });
      return ResponseEntity.ok(rows);
    }catch(Exception e){ return ResponseEntity.ok(java.util.List.of()); }
  }

  @DeleteMapping("/users/{id}")
  public ResponseEntity<?> deleteUser(@PathVariable String id){
    try{
      jdbc.update("DELETE FROM sessions WHERE userId=?", id);
      jdbc.update("DELETE FROM users WHERE id=?", id);
      return ResponseEntity.ok(java.util.Map.of("ok", true));
    }catch(Exception e){ return ResponseEntity.status(500).body(java.util.Map.of("error","Failed")); }
  }

  @DeleteMapping("/providers/{id}")
  public ResponseEntity<?> deleteProvider(@PathVariable String id){
    try{
      jdbc.update("DELETE FROM listings WHERE providerId=?", id);
      jdbc.update("DELETE FROM provider_reviews WHERE providerId=?", id);
      jdbc.update("DELETE FROM orders WHERE providerId=?", id);
      jdbc.update("DELETE FROM players WHERE id=?", id);
      // Optionally unlink users.providerPlayerId
      jdbc.update("UPDATE users SET providerPlayerId=NULL WHERE providerPlayerId=?", id);
      return ResponseEntity.ok(java.util.Map.of("ok", true));
    }catch(Exception e){ return ResponseEntity.status(500).body(java.util.Map.of("error","Failed")); }
  }

  @DeleteMapping("/listings/{id}")
  public ResponseEntity<?> deleteListing(@PathVariable String id){
    try{
      jdbc.update("DELETE FROM listings WHERE id=?", id);
      return ResponseEntity.ok(java.util.Map.of("ok", true));
    }catch(Exception e){ return ResponseEntity.status(500).body(java.util.Map.of("error","Failed")); }
  }
}

