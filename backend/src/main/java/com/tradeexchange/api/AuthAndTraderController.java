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
  public record CheckoutRequest(Double amount, String name, String email, String note, String listingId, String providerId, String date, String time, String address, String phone, String tasks){}
  @PostMapping("/checkout")
  public ResponseEntity<?> checkout(@RequestBody CheckoutRequest req){
    // Record an order as paid and include customer details for the trader
    try{
      String id = rid();
      String createdAt = Instant.now().toString();
      Double amount = Optional.ofNullable(req.amount()).orElse(0.0);
      String providerId = Optional.ofNullable(req.providerId()).orElse("");
      String listingId = Optional.ofNullable(req.listingId()).orElse("");
      String userName = Optional.ofNullable(req.name()).filter(s->!s.isBlank()).orElse(Optional.ofNullable(req.email()).orElse("Customer"));
      String details = String.join("\n", new String[]{
        Optional.ofNullable(req.note()).orElse(""),
        (req.tasks()==null||req.tasks().isBlank()? null : ("Tasks: "+req.tasks())),
        (req.address()==null||req.address().isBlank()? null : ("Address: "+req.address())),
        (req.phone()==null||req.phone().isBlank()? null : ("Phone: "+req.phone())),
      }).replaceAll("^(\n)+|\n+$","");
      String reqDate = Optional.ofNullable(req.date()).orElse("");
      String reqTime = Optional.ofNullable(req.time()).orElse("");

      jdbc.update("INSERT INTO orders (id,userName,service,status,amount,createdAt,providerId,listingId,conversationId,reqDetails,reqDate,reqTime,reqAck) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        userName,
        "Service purchase",
        "approved",
        amount,
        createdAt,
        providerId,
        listingId,
        null,
        details,
        reqDate,
        reqTime,
        1
      );

      String txId = UUID.randomUUID().toString().replace("-","").substring(0,16);
      return ResponseEntity.ok(Map.of("ok", true, "orderId", id, "txId", txId));
    }catch(Exception e){
      return ResponseEntity.status(500).body(Map.of("error","Checkout failed"));
    }
  }

  // --- Stripe: create PaymentIntent and return client_secret ---
  public record CreatePI(Double amount, String currency){}
  @PostMapping("/stripe/create-payment-intent")
  public ResponseEntity<?> createPaymentIntent(@RequestBody CreatePI req){
    try{
      String secret = Optional.ofNullable(System.getenv("STRIPE_SECRET")).orElse("");
      if (secret.isBlank()) return ResponseEntity.status(500).body(Map.of("error","Stripe secret not configured"));
      int amountCents = (int) Math.max(0, Math.round(Optional.ofNullable(req.amount()).orElse(0.0) * 100));
      String currency = Optional.ofNullable(req.currency()).orElse("usd");

      java.net.URL url = new java.net.URL("https://api.stripe.com/v1/payment_intents");
      java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
      conn.setRequestMethod("POST");
      conn.setDoOutput(true);
      conn.setRequestProperty("Authorization", "Bearer " + secret);
      conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

      String body = "amount=" + amountCents + "&currency=" + java.net.URLEncoder.encode(currency, java.nio.charset.StandardCharsets.UTF_8) +
        "&automatic_payment_methods[enabled]=true";
      try (java.io.OutputStream os = conn.getOutputStream()){
        os.write(body.getBytes(java.nio.charset.StandardCharsets.UTF_8));
      }
      int code = conn.getResponseCode();
      java.io.InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
      String json = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
      if (code < 200 || code >= 300){
        return ResponseEntity.status(500).body(Map.of("error","Stripe error", "details", json));
      }
      // naive parse for client_secret and id
      String clientSecret = extractJson(json, "client_secret");
      String id = extractJson(json, "id");
      return ResponseEntity.ok(Map.of("clientSecret", clientSecret, "id", id));
    }catch(Exception e){
      return ResponseEntity.status(500).body(Map.of("error","Failed to create payment intent"));
    }
  }

  // --- Stripe: create Checkout Session and return url ---
  public record CreateCheckoutSession(Double amount, String currency, String successUrl, String cancelUrl, Map<String,String> metadata){}
  @PostMapping("/stripe/create-checkout-session")
  public ResponseEntity<?> createCheckoutSession(@RequestBody CreateCheckoutSession req){
    try{
      String secret = Optional.ofNullable(System.getenv("STRIPE_SECRET")).orElse("");
      if (secret.isBlank()) return ResponseEntity.status(500).body(Map.of("error","Stripe secret not configured"));
      int amountCents = (int) Math.max(0, Math.round(Optional.ofNullable(req.amount()).orElse(0.0) * 100));
      String currency = Optional.ofNullable(req.currency()).orElse("usd");
      String successUrl = Optional.ofNullable(req.successUrl()).orElse("");
      String cancelUrl = Optional.ofNullable(req.cancelUrl()).orElse("");

      java.net.URL url = new java.net.URL("https://api.stripe.com/v1/checkout/sessions");
      java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
      conn.setRequestMethod("POST");
      conn.setDoOutput(true);
      conn.setRequestProperty("Authorization", "Bearer " + secret);
      conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

      String enc = java.nio.charset.StandardCharsets.UTF_8.name();
      StringBuilder body = new StringBuilder();
      body.append("mode=payment");
      body.append("&success_url=").append(java.net.URLEncoder.encode(successUrl, java.nio.charset.StandardCharsets.UTF_8));
      body.append("&cancel_url=").append(java.net.URLEncoder.encode(cancelUrl, java.nio.charset.StandardCharsets.UTF_8));
      body.append("&line_items[0][price_data][currency]=").append(java.net.URLEncoder.encode(currency, java.nio.charset.StandardCharsets.UTF_8));
      body.append("&line_items[0][price_data][unit_amount]=").append(amountCents);
      body.append("&line_items[0][price_data][product_data][name]=").append(java.net.URLEncoder.encode("Service purchase", java.nio.charset.StandardCharsets.UTF_8));
      body.append("&line_items[0][quantity]=1");
      Map<String,String> meta = Optional.ofNullable(req.metadata()).orElseGet(HashMap::new);
      for (Map.Entry<String,String> entry : meta.entrySet()){
        if (entry.getKey()==null || entry.getKey().isBlank()) continue;
        String val = Optional.ofNullable(entry.getValue()).orElse("");
        body.append("&metadata[").append(java.net.URLEncoder.encode(entry.getKey(), java.nio.charset.StandardCharsets.UTF_8)).append("]=")
          .append(java.net.URLEncoder.encode(val, java.nio.charset.StandardCharsets.UTF_8));
      }
      try (java.io.OutputStream os = conn.getOutputStream()){
        os.write(body.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
      }
      int code = conn.getResponseCode();
      java.io.InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
      String json = new String(is.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
      if (code < 200 || code >= 300){
        return ResponseEntity.status(500).body(Map.of("error","Stripe error", "details", json));
      }
      String urlStr = extractJson(json, "url");
      String id = extractJson(json, "id");
      return ResponseEntity.ok(Map.of("url", urlStr, "id", id));
    }catch(Exception e){
      return ResponseEntity.status(500).body(Map.of("error","Failed to create checkout session"));
    }
  }

  private String extractJson(String json, String key){
    try{
      String pat = "\"" + key + "\"\s*:\s*\"";
      java.util.regex.Matcher m = java.util.regex.Pattern.compile(pat).matcher(json);
      if (m.find()){
        int start = m.end();
        int end = json.indexOf('"', start);
        if (end > start) return json.substring(start, end);
      }
    }catch(Exception ignore){}
    return "";
  }
}
