package com.tradeexchange.api;

import com.tradeexchange.common.PasswordService;
import com.tradeexchange.common.SessionResolver;
import com.tradeexchange.common.SessionResolver.UserSession;
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
  private final PasswordService passwords;
  private final SessionResolver sessions;
  public AuthAndTraderController(JdbcTemplate jdbc, PasswordService passwords, SessionResolver sessions){
    this.jdbc = jdbc;
    this.passwords = passwords;
    this.sessions = sessions;
  }

  static String rid(){ return UUID.randomUUID().toString().replace("-"," ").trim().replace(" ","").substring(0,12); }

  // ---- Auth endpoints compatible with frontend ----
  public record SignRequest(String name, String email, String password, String role){}
  public record SignInRequest(String email, String password){}

  @PostMapping("/signup")
  public ResponseEntity<?> signup(@RequestBody SignRequest req){
    try{
      String email = Optional.ofNullable(req.email()).map(String::trim).map(String::toLowerCase).orElse("");
      if (email.isEmpty()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error","Email required"));
      String password = Optional.ofNullable(req.password()).orElse("");
      if (password.isBlank()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error","Password required"));
      String name = Optional.ofNullable(req.name()).filter(s -> !s.isBlank()).orElseGet(() -> email.contains("@") ? email.substring(0, email.indexOf('@')) : email);
      String role = Optional.ofNullable(req.role()).orElse("USER").trim().toUpperCase(Locale.ROOT);
      String now = Instant.now().toString();

      Map<String,Object> existing = jdbc.query(
        "SELECT id, providerPlayerId FROM users WHERE lower(email)=lower(?)",
        ps -> ps.setString(1, email),
        rs -> {
          if (!rs.next()) return null;
          Map<String,Object> row = new HashMap<>();
          row.put("id", rs.getString("id"));
          row.put("providerPlayerId", rs.getString("providerPlayerId"));
          return row;
        }
      );

      String id;
      String providerId = null;
      String hash = passwords.hashPassword(password);
      if (existing == null) {
        id = rid();
        jdbc.update(
          "INSERT INTO users (id,name,email,password,role,createdAt) VALUES (?,?,?,?,?,?)",
          id, name, email, hash, role, now
        );
      } else {
        id = String.valueOf(existing.get("id"));
        providerId = (String) existing.get("providerPlayerId");
        jdbc.update(
          "UPDATE users SET name=?, role=?, password=?, createdAt=COALESCE(createdAt, ?) WHERE id=?",
          name, role, hash, now, id
        );
      }

      String token = randomToken();
      jdbc.update("INSERT OR REPLACE INTO sessions (token,userId) VALUES (?,?)", token, id);
      Map<String,Object> user = loadUser(id);
      if (user == null) {
        user = new LinkedHashMap<>();
        user.put("id", id);
        user.put("name", name);
        user.put("email", email);
        user.put("role", role);
        user.put("providerPlayerId", providerId);
      }
      return ResponseEntity.ok(Map.of("token", token, "user", user));
    }catch(Exception e){ return ResponseEntity.status(500).body(Map.of("error","Signup failed")); }
  }

  @PostMapping("/signin")
  public ResponseEntity<?> signin(@RequestBody SignInRequest req){
    try{
      String email = Optional.ofNullable(req.email()).map(String::trim).map(String::toLowerCase).orElse("");
      if (email.isEmpty()) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error","Email required"));
      String attempt = Optional.ofNullable(req.password()).orElse("");

      Map<String,Object> row = jdbc.query(
        "SELECT id,name,email,role,providerPlayerId,password FROM users WHERE lower(email)=lower(?)",
        ps -> ps.setString(1, email),
        rs -> {
          if (!rs.next()) return null;
          Map<String,Object> map = new LinkedHashMap<>();
          map.put("id", rs.getString("id"));
          map.put("name", rs.getString("name"));
          map.put("email", rs.getString("email"));
          map.put("role", rs.getString("role"));
          map.put("providerPlayerId", rs.getString("providerPlayerId"));
          map.put("password", rs.getString("password"));
          return map;
        }
      );
      if (row == null) return ResponseEntity.status(401).body(Map.of("error","Invalid credentials"));

      String stored = (String) row.remove("password");
      if (!passwords.verifyPassword(stored, attempt)){
        return ResponseEntity.status(401).body(Map.of("error","Invalid credentials"));
      }

      String id = String.valueOf(row.get("id"));
      String token = randomToken();
      jdbc.update("INSERT OR REPLACE INTO sessions (token,userId) VALUES (?,?)", token, id);
      Map<String,Object> user = loadUser(id);
      if (user == null) user = row;
      return ResponseEntity.ok(Map.of("token", token, "user", user));
    }catch(Exception e){ return ResponseEntity.status(500).body(Map.of("error","Signin failed")); }
  }

  @PostMapping("/signout")
  public ResponseEntity<?> signout(@RequestHeader(value="Authorization", required=false) String auth){
    try{
      String token = sessions.extractToken(auth);
      if (!token.isEmpty()){
        jdbc.update("DELETE FROM sessions WHERE token=?", token);
      }
    }catch(Exception ignore){}
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(@RequestHeader(value="Authorization", required=false) String auth){
    Optional<UserSession> session = sessions.fromAuthorization(auth);
    if (session.isEmpty()) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","Invalid token"));
    }
    Map<String,Object> user = loadUser(session.get().id());
    if (user == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","Invalid token"));
    }
    return ResponseEntity.ok(user);
  }

  @PostMapping("/become-provider")
  public ResponseEntity<?> becomeProvider(@RequestHeader(value="Authorization", required=false) String auth){
    Optional<UserSession> session = sessions.fromAuthorization(auth);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","Invalid token"));
    try{
      UserSession user = session.get();
      String uid = user.id();
      String pid = user.providerPlayerId();
      if (pid == null || pid.isBlank()){
        pid = rid();
        jdbc.update("INSERT INTO players (id,name,role,rating,jobs,bio) VALUES (?,?,?,?,?,?)",
          pid,
          Optional.ofNullable(user.name()).orElse("Trader"),
          "PROVIDER",
          5.0,
          0,
          ""
        );
      }
      jdbc.update("UPDATE users SET role='TRADER', providerPlayerId=? WHERE id=?", pid, uid);
      Map<String,Object> updated = loadUser(uid);
      Map<String,Object> resp = new LinkedHashMap<>();
      resp.put("ok", true);
      resp.put("user", updated);
      resp.put("providerId", pid);
      return ResponseEntity.ok(resp);
    }catch(Exception e){ return ResponseEntity.status(500).body(Map.of("error","Failed")); }
  }

  private Map<String,Object> loadUser(String id){
    if (id == null || id.isBlank()) return null;
    return jdbc.query(
      "SELECT id,name,email,role,providerPlayerId FROM users WHERE id=?",
      ps -> ps.setString(1, id),
      rs -> {
        if (!rs.next()) return null;
        Map<String,Object> map = new LinkedHashMap<>();
        map.put("id", rs.getString("id"));
        map.put("name", Optional.ofNullable(rs.getString("name")).orElse(""));
        map.put("email", Optional.ofNullable(rs.getString("email")).orElse(""));
        map.put("role", Optional.ofNullable(rs.getString("role")).orElse("USER").toUpperCase(Locale.ROOT));
        map.put("providerPlayerId", rs.getString("providerPlayerId"));
        return map;
      }
    );
  }

  private String randomToken(){
    return UUID.randomUUID().toString().replace("-", "").substring(0, 24);
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
