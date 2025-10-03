package com.tradeexchange.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class AuthAndTraderController {

  private final JdbcTemplate jdbc;
  public AuthAndTraderController(JdbcTemplate jdbc){ this.jdbc = jdbc; }

  static String rid(){ return UUID.randomUUID().toString().replace("-"," ").trim().replace(" ","").substring(0,12); }

  // ---- Auth endpoints compatible with frontend ----
  public record SignRequest(String name, String email, String password, String role){}
  public record SignInRequest(String email, String password){}

  @PostMapping("/signup")
  public ResponseEntity<?> signup(@RequestBody SignRequest req){
    try{
      String email = Optional.ofNullable(req.email()).orElse("").trim().toLowerCase();
      if (email.isEmpty()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error","Email required"));
      // Ensure table
      jdbc.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, role TEXT, providerPlayerId TEXT)");
      jdbc.execute("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT)");
      List<Map<String,Object>> found = jdbc.query("SELECT id,name,email,role,providerPlayerId FROM users WHERE email=?", ps -> ps.setString(1,email), rs -> {
        List<Map<String,Object>> out = new ArrayList<>(); if (rs.next()){ out.add(Map.of("id",rs.getString(1),"name",rs.getString(2),"email",rs.getString(3),"role",rs.getString(4),"providerPlayerId",rs.getString(5))); } return out; });
      String id;
      String name = Optional.ofNullable(req.name()).orElse(email.split("@")[0]);
      String role = Optional.ofNullable(req.role()).orElse("USER").toUpperCase();
      if (found.isEmpty()){
        id = rid();
        jdbc.update("INSERT INTO users (id,name,email,role) VALUES (?,?,?,?)", id, name, email, role);
      } else {
        id = String.valueOf(found.get(0).get("id"));
        jdbc.update("UPDATE users SET name=?, role=? WHERE id=?", name, role, id);
      }
      String token = UUID.randomUUID().toString().substring(0,16);
      jdbc.update("INSERT OR REPLACE INTO sessions (token,userId) VALUES (?,?)", token, id);
      Map<String,Object> user = new LinkedHashMap<>(); user.put("id", id); user.put("name", name); user.put("email", email); user.put("role", role);
      return ResponseEntity.ok(Map.of("token", token, "user", user));
    }catch(Exception e){ return ResponseEntity.status(500).body(Map.of("error","Signup failed")); }
  }

  @PostMapping("/signin")
  public ResponseEntity<?> signin(@RequestBody SignInRequest req){
    try{
      String email = Optional.ofNullable(req.email()).orElse("").trim().toLowerCase();
      if (email.isEmpty()) return ResponseEntity.status(400).body(Map.of("error","Email required"));
      List<Map<String,Object>> row = jdbc.query("SELECT id,name,email,role,providerPlayerId FROM users WHERE email=?", ps -> ps.setString(1,email), rs -> {
        List<Map<String,Object>> out = new ArrayList<>(); if (rs.next()){ out.add(Map.of("id",rs.getString(1),"name",rs.getString(2),"email",rs.getString(3),"role",rs.getString(4),"providerPlayerId",rs.getString(5))); } return out; });
      if (row.isEmpty()) return ResponseEntity.status(401).body(Map.of("error","Invalid credentials"));
      String id = String.valueOf(row.get(0).get("id"));
      String token = UUID.randomUUID().toString().substring(0,16);
      jdbc.execute("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT)");
      jdbc.update("INSERT OR REPLACE INTO sessions (token,userId) VALUES (?,?)", token, id);
      return ResponseEntity.ok(Map.of("token", token, "user", row.get(0)));
    }catch(Exception e){ return ResponseEntity.status(500).body(Map.of("error","Signin failed")); }
  }

  @PostMapping("/signout")
  public ResponseEntity<?> signout(@RequestHeader(value="Authorization", required=false) String auth){
    try{ String t = (auth!=null && auth.startsWith("Bearer "))? auth.substring(7):""; if (!t.isEmpty()) jdbc.update("DELETE FROM sessions WHERE token=?", t); }catch(Exception ignore){}
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(@RequestHeader(value="Authorization", required=false) String auth){
    if (auth==null || !auth.startsWith("Bearer ")) return ResponseEntity.status(401).body(Map.of("error","No token"));
    String t = auth.substring(7);
    try{
      Map<String,Object> u = jdbc.query(
        "SELECT users.id, users.name, users.email, users.role, users.providerPlayerId FROM sessions JOIN users ON users.id=sessions.userId WHERE sessions.token=?",
        ps -> ps.setString(1,t), rs -> {
          if (!rs.next()) return null; return Map.of("id", rs.getString(1), "name", rs.getString(2), "email", rs.getString(3), "role", rs.getString(4), "providerPlayerId", rs.getString(5));
        }
      );
      if (u==null) return ResponseEntity.status(401).body(Map.of("error","Invalid token"));
      return ResponseEntity.ok(u);
    }catch(Exception e){ return ResponseEntity.status(401).body(Map.of("error","Invalid token")); }
  }

  @PostMapping("/become-provider")
  public ResponseEntity<?> becomeProvider(@RequestHeader(value="Authorization", required=false) String auth){
    if (auth==null || !auth.startsWith("Bearer ")) return ResponseEntity.status(401).body(Map.of("error","No token"));
    String t = auth.substring(7);
    try{
      Map<String,Object> u = jdbc.query("SELECT users.id, users.name, users.email, users.role, users.providerPlayerId FROM sessions JOIN users ON users.id=sessions.userId WHERE sessions.token=?",
        ps -> ps.setString(1,t), rs -> { if (!rs.next()) return null; return Map.of("id", rs.getString(1), "name", rs.getString(2), "email", rs.getString(3), "role", rs.getString(4), "providerPlayerId", rs.getString(5)); });
      if (u==null) return ResponseEntity.status(401).body(Map.of("error","Invalid token"));
      String uid = String.valueOf(u.get("id"));
      String pid = (String)u.get("providerPlayerId");
      if (pid==null || pid.isBlank()){
        pid = rid();
        jdbc.update("INSERT INTO players (id,name,role,rating,jobs,bio) VALUES (?,?,?,?,?,?)", pid, String.valueOf(u.get("name")), "PROVIDER", 5.0, 0, "");
        jdbc.update("UPDATE users SET role='TRADER', providerPlayerId=? WHERE id=?", pid, uid);
      } else {
        jdbc.update("UPDATE users SET role='TRADER' WHERE id=?", uid);
      }
      Map<String,Object> resp = new LinkedHashMap<>(); resp.put("ok", true); resp.put("user", Map.of("id", uid, "name", u.get("name"), "email", u.get("email"), "role", "TRADER", "providerPlayerId", pid)); resp.put("providerId", pid);
      return ResponseEntity.ok(resp);
    }catch(Exception e){ return ResponseEntity.status(500).body(Map.of("error","Failed")); }
  }

  // ---- Trader listings CRUD ----
  public record UpsertListing(String id, String providerId, String title, String description, String details, Double price, String status, String tags){}

  @GetMapping("/trader/listings")
  public ResponseEntity<?> listListings(@RequestParam(value="providerId", required=false) String providerId){
    try{
      String sql = (providerId!=null && !providerId.isBlank()) ? "SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings WHERE providerId=?" : "SELECT id,title,description,price,providerId,status,createdAt,tags FROM listings";
      List<Map<String,Object>> rows = jdbc.query(sql, ps -> { if (providerId!=null && !providerId.isBlank()) ps.setString(1, providerId); }, rs -> {
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

  @PostMapping("/trader/listings")
  public ResponseEntity<?> createListing(@RequestBody UpsertListing req){
    String id = rid();
    String createdAt = Instant.now().toString();
    jdbc.update("INSERT INTO listings (id,title,description,price,providerId,status,createdAt,tags) VALUES (?,?,?,?,?,?,?,?)",
      id,
      Optional.ofNullable(req.title()).orElse("Untitled"),
      Optional.ofNullable(req.description()).orElse(""),
      Optional.ofNullable(req.price()).orElse(0.0),
      Optional.ofNullable(req.providerId()).orElse(""),
      Optional.ofNullable(req.status()).orElse("LISTED"),
      createdAt,
      Optional.ofNullable(req.tags()).orElse("")
    );
    Map<String,Object> row = new LinkedHashMap<>();
    row.put("id", id); row.put("title", req.title()); row.put("description", req.description()); row.put("price", req.price()); row.put("providerId", req.providerId()); row.put("status", Optional.ofNullable(req.status()).orElse("LISTED")); row.put("createdAt", createdAt); row.put("tags", Optional.ofNullable(req.tags()).orElse(""));
    return ResponseEntity.ok(row);
  }

  @PutMapping("/trader/listings/{id}")
  public ResponseEntity<?> updateListing(@PathVariable String id, @RequestBody UpsertListing req){
    jdbc.update("UPDATE listings SET title=?, description=?, price=?, providerId=?, status=?, tags=? WHERE id=?",
      Optional.ofNullable(req.title()).orElse("Untitled"),
      Optional.ofNullable(req.description()).orElse(""),
      Optional.ofNullable(req.price()).orElse(0.0),
      Optional.ofNullable(req.providerId()).orElse(""),
      Optional.ofNullable(req.status()).orElse("LISTED"),
      Optional.ofNullable(req.tags()).orElse(""),
      id
    );
    Map<String,Object> row = new LinkedHashMap<>();
    row.put("id", id); row.put("title", req.title()); row.put("description", req.description()); row.put("price", req.price()); row.put("providerId", req.providerId()); row.put("status", Optional.ofNullable(req.status()).orElse("LISTED")); row.put("tags", Optional.ofNullable(req.tags()).orElse(""));
    return ResponseEntity.ok(row);
  }

  // ---- Checkout endpoint used by frontend ----
  public record CheckoutRequest(Double amount, String name, String email, String note, String listingId, String providerId){}
  @PostMapping("/checkout")
  public ResponseEntity<?> checkout(@RequestBody CheckoutRequest req){
    // For now, accept and return ok; frontend handles navigation to chat
    return ResponseEntity.ok(Map.of("ok", true));
  }
}

