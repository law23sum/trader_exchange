package com.tradeexchange.api;

import com.tradeexchange.common.SessionResolver;
import com.tradeexchange.common.SessionResolver.UserSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api")
public class OrdersController {
  private final org.springframework.jdbc.core.JdbcTemplate jdbc;
  private final SessionResolver sessions;

  public OrdersController(org.springframework.jdbc.core.JdbcTemplate jdbc, SessionResolver sessions){
    this.jdbc = jdbc;
    this.sessions = sessions;
  }

  @GetMapping("/trader/orders")
  public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authz){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();
    boolean isAdmin = "ADMIN".equalsIgnoreCase(user.role());
    boolean isTrader = "TRADER".equalsIgnoreCase(user.role());
    if (!isAdmin && !isTrader) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));

    String sql = "SELECT id,userName,service,status,amount,createdAt,providerId,listingId,conversationId,reqDetails,reqDate,reqTime,reqAck FROM orders";
    Object[] params = new Object[]{};
    if (isTrader && user.providerPlayerId() != null && !user.providerPlayerId().isBlank()){
      sql += " WHERE providerId = ?";
      params = new Object[]{ user.providerPlayerId() };
    }
    sql += " ORDER BY createdAt DESC";

    Object[] finalParams = params;
    var rows = jdbc.query(sql, ps -> {
        for (int i = 0; i < finalParams.length; i++) ps.setObject(i + 1, finalParams[i]);
      }, rs -> {
        List<Map<String,Object>> out = new ArrayList<>();
        while (rs.next()){
          Map<String,Object> req = new LinkedHashMap<>();
          req.put("details", rs.getString("reqDetails"));
          req.put("date", rs.getString("reqDate"));
          req.put("time", rs.getString("reqTime"));
          req.put("ack", rs.getInt("reqAck") != 0);
          Map<String,Object> row = new LinkedHashMap<>();
          row.put("id", rs.getString("id"));
          row.put("userName", Optional.ofNullable(rs.getString("userName")).orElse("Customer"));
          row.put("service", rs.getString("service"));
          row.put("status", rs.getString("status"));
          row.put("amount", Double.valueOf(Optional.ofNullable(rs.getObject("amount")).orElse(0).toString()));
          row.put("createdAt", rs.getString("createdAt"));
          row.put("providerId", rs.getString("providerId"));
          row.put("listingId", rs.getString("listingId"));
          row.put("conversationId", rs.getString("conversationId"));
          row.put("request", req);
          out.add(row);
        }
        return out;
      });
    return ResponseEntity.ok(rows);
  }

  public record Action(String action){}
  @PostMapping("/trader/orders/{id}/action")
  public ResponseEntity<?> action(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authz, @RequestBody Action req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();
    if (!"TRADER".equalsIgnoreCase(user.role()) && !"ADMIN".equalsIgnoreCase(user.role())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));

    String a = Optional.ofNullable(req.action()).orElse("").toLowerCase();
    Map<String,String> map = Map.of(
      "approve","approved",
      "deny","denied",
      "refund","refunded",
      "discuss","discuss",
      "exchange","exchange",
      "complete","complete"
    );
    if (!map.containsKey(a)) return ResponseEntity.badRequest().body(Map.of("message","Invalid action"));

    jdbc.update("UPDATE orders SET status=?, reqAck=CASE WHEN ?='approved' THEN 1 ELSE reqAck END WHERE id=?",
      map.get(a),
      map.get(a),
      id
    );

    if ("complete".equals(map.get(a))) {
      // increment trader jobs count when an order is completed
      try{
        var provider = jdbc.query("SELECT providerId FROM orders WHERE id=?", ps -> ps.setString(1,id), rs -> rs.next() ? rs.getString(1) : null);
        if (provider != null && !provider.isBlank()){
          jdbc.update("UPDATE players SET jobs = COALESCE(jobs,0)+1 WHERE id=?", provider);
        }
      }catch(Exception ignore){}
    }

    var row = jdbc.query("SELECT id,userName,service,status,amount,createdAt,providerId,listingId,conversationId,reqDetails,reqDate,reqTime,reqAck FROM orders WHERE id=?",
      ps -> ps.setString(1,id),
      rs -> {
        if (!rs.next()) return null;
        Map<String,Object> request = new LinkedHashMap<>();
        request.put("details", rs.getString("reqDetails"));
        request.put("date", rs.getString("reqDate"));
        request.put("time", rs.getString("reqTime"));
        request.put("ack", rs.getInt("reqAck")!=0);
        Map<String,Object> row2 = new LinkedHashMap<>();
        row2.put("id", rs.getString("id"));
        row2.put("userName", Optional.ofNullable(rs.getString("userName")).orElse("Customer"));
        row2.put("service", rs.getString("service"));
        row2.put("status", rs.getString("status"));
        row2.put("amount", Double.valueOf(Optional.ofNullable(rs.getObject("amount")).orElse(0).toString()));
        row2.put("createdAt", rs.getString("createdAt"));
        row2.put("providerId", rs.getString("providerId"));
        row2.put("listingId", rs.getString("listingId"));
        row2.put("conversationId", rs.getString("conversationId"));
        row2.put("request", request);
        return row2;
      }
    );
    if (row==null) return ResponseEntity.status(404).body(Map.of("message","Order not found"));
    return ResponseEntity.ok(Map.of("ok",true, "order", row));
  }

  // --- User schedules a consultation before purchasing (optional) ---
  public record ScheduleConsultation(String conversationId, String date, String time){ }
  @PostMapping("/orders/{id}/schedule-consultation")
  public ResponseEntity<?> scheduleConsultation(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authz, @RequestBody ScheduleConsultation req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    jdbc.update("UPDATE orders SET reqDate=?, reqTime=?, conversationId=COALESCE(?, conversationId) WHERE id=?",
      Optional.ofNullable(req.date()).orElse(""),
      Optional.ofNullable(req.time()).orElse(""),
      Optional.ofNullable(req.conversationId()).orElse(null),
      id
    );
    return ResponseEntity.ok(Map.of("ok", true));
  }

  // --- Trader marks service completed and shares completion details with customer ---
  public record CompletionDetails(String notes, String photoUrl){ }
  @PostMapping("/trader/orders/{id}/complete-with-details")
  public ResponseEntity<?> completeWithDetails(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authz, @RequestBody CompletionDetails req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();
    if (!"TRADER".equalsIgnoreCase(user.role()) && !"ADMIN".equalsIgnoreCase(user.role())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
    String appendix = String.join("\n", java.util.stream.Stream.of(
      Optional.ofNullable(req.notes()).filter(s->!s.isBlank()).map(s->"Completion notes: "+s).orElse(null),
      Optional.ofNullable(req.photoUrl()).filter(s->!s.isBlank()).map(s->"Photo: "+s).orElse(null)
    ).filter(java.util.Objects::nonNull).toList());
    if (!appendix.isBlank()){
      jdbc.update("UPDATE orders SET reqDetails=TRIM(COALESCE(reqDetails,'') || CASE WHEN ?<>'' THEN char(10)||? ELSE '' END) WHERE id=?",
        appendix,
        appendix,
        id
      );
    }
    jdbc.update("UPDATE orders SET status='complete' WHERE id=?", id);
    try{
      var provider = jdbc.query("SELECT providerId FROM orders WHERE id=?", ps -> ps.setString(1,id), rs -> rs.next() ? rs.getString(1) : null);
      if (provider != null && !provider.isBlank()){
        jdbc.update("UPDATE players SET jobs = COALESCE(jobs,0)+1 WHERE id=?", provider);
      }
    }catch(Exception ignore){}
    return ResponseEntity.ok(Map.of("ok", true));
  }

  // --- Users leave a review after completion; update provider average rating ---
  public record NewReview(Integer rating, String text){ }
  @PostMapping("/orders/{id}/review")
  public ResponseEntity<?> leaveReview(@PathVariable String id, @RequestHeader(value = "Authorization", required = false) String authz, @RequestBody NewReview req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    int rating = Math.max(1, Math.min(5, Optional.ofNullable(req.rating()).orElse(5)));
    String text = Optional.ofNullable(req.text()).orElse("");
    String reviewId = UUID.randomUUID().toString().substring(0,8);
    String now = Instant.now().toString();
    var provider = jdbc.query("SELECT providerId FROM orders WHERE id=?", ps -> ps.setString(1,id), rs -> rs.next() ? rs.getString(1) : null);
    if (provider == null || provider.isBlank()) return ResponseEntity.status(404).body(Map.of("message","Order not found"));
    jdbc.update("INSERT INTO provider_reviews (id,providerId,author,rating,text,at) VALUES (?,?,?,?,?,?)",
      reviewId, provider, Optional.ofNullable(session.get().name()).orElse("Customer"), rating, text, now);
    // recompute average rating
    var avg = jdbc.query("SELECT AVG(rating) FROM provider_reviews WHERE providerId=?", ps -> ps.setString(1, provider), rs -> rs.next() ? rs.getDouble(1) : 0.0);
    jdbc.update("UPDATE players SET rating=? WHERE id=?", avg, provider);
    return ResponseEntity.ok(Map.of("ok", true, "reviewId", reviewId, "rating", rating));
  }

  public record NewRequest(String providerId, String listingId, String title, String details, String date, String time, String conversationId){}
  @PostMapping("/orders/request")
  public ResponseEntity<?> newRequest(@RequestHeader(value = "Authorization", required = false) String authz,
                                       @RequestBody NewRequest req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();

    String id = UUID.randomUUID().toString().substring(0,8);
    String createdAt = Instant.now().toString();
    String userName = user.name() != null && !user.name().isBlank() ? user.name() : Optional.ofNullable(user.email()).orElse("Customer");

    jdbc.update("INSERT INTO orders (id,userName,service,status,amount,createdAt,providerId,listingId,conversationId,reqDetails,reqDate,reqTime,reqAck) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      userName,
      Optional.ofNullable(req.title()).orElse("Service request"),
      "discuss",
      0.0,
      createdAt,
      req.providerId(),
      req.listingId(),
      req.conversationId(),
      Optional.ofNullable(req.details()).orElse(""),
      Optional.ofNullable(req.date()).orElse(""),
      Optional.ofNullable(req.time()).orElse(""),
      0
    );

    Map<String,Object> request = new LinkedHashMap<>();
    request.put("details", Optional.ofNullable(req.details()).orElse(""));
    request.put("date", Optional.ofNullable(req.date()).orElse(""));
    request.put("time", Optional.ofNullable(req.time()).orElse(""));
    request.put("ack", false);

    Map<String,Object> row = new LinkedHashMap<>();
    row.put("id", id);
    row.put("userName", userName);
    row.put("service", Optional.ofNullable(req.title()).orElse("Service request"));
    row.put("status", "discuss");
    row.put("amount", 0.0);
    row.put("createdAt", createdAt);
    row.put("providerId", req.providerId());
    row.put("listingId", req.listingId());
    row.put("conversationId", req.conversationId());
    row.put("request", request);
    return ResponseEntity.ok(Map.of("ok", true, "order", row));
  }

  @GetMapping("/orders/status")
  public ResponseEntity<?> status(@RequestHeader(value = "Authorization", required = false) String authz,
                                  @RequestParam String providerId,
                                  @RequestParam String listingId){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));

    var row = jdbc.query("SELECT status, reqAck, conversationId, createdAt FROM orders WHERE providerId=? AND listingId=? ORDER BY createdAt DESC LIMIT 1",
      ps -> {
        ps.setString(1, providerId);
        ps.setString(2, listingId);
      },
      rs -> {
        if (!rs.next()) return null;
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("status", rs.getString("status"));
        m.put("ack", rs.getInt("reqAck")!=0);
        m.put("conversationId", rs.getString("conversationId"));
        m.put("updatedAt", rs.getString("createdAt"));
        m.put("found", true);
        return m;
      }
    );
    if (row==null) return ResponseEntity.ok(Map.of("ok", true, "found", false, "status", "none", "ack", false));
    return ResponseEntity.ok(row);
  }

  @GetMapping("/orders/mine")
  public ResponseEntity<?> myOrders(@RequestHeader(value = "Authorization", required = false) String authz){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();
    String name = Optional.ofNullable(user.name()).orElse("").trim();
    String email = Optional.ofNullable(user.email()).orElse("").trim();
    List<String> conditions = new ArrayList<>();
    List<Object> params = new ArrayList<>();
    if (!name.isBlank()){
      conditions.add("LOWER(o.userName) = ?");
      params.add(name.toLowerCase());
    }
    if (!email.isBlank()){
      conditions.add("LOWER(o.userName) = ?");
      params.add(email.toLowerCase());
    }
    if (conditions.isEmpty()){
      return ResponseEntity.ok(List.of());
    }
    String where = String.join(" OR ", conditions);
    String sql = "SELECT o.id, o.service, o.status, o.amount, o.createdAt, o.providerId, o.listingId, o.conversationId, o.reqDetails, o.reqDate, o.reqTime, o.reqAck, p.name AS providerName " +
      "FROM orders o LEFT JOIN players p ON p.id = o.providerId WHERE " + where + " ORDER BY o.createdAt DESC";
    List<Map<String,Object>> rows = jdbc.query(sql,
      ps -> {
        for (int i = 0; i < params.size(); i++) ps.setObject(i + 1, params.get(i));
      },
      rs -> {
        List<Map<String,Object>> out = new ArrayList<>();
        while (rs.next()){
          Map<String,Object> m = new LinkedHashMap<>();
          m.put("id", rs.getString("id"));
          m.put("service", rs.getString("service"));
          m.put("status", rs.getString("status"));
          m.put("amount", rs.getObject("amount"));
          m.put("createdAt", rs.getString("createdAt"));
          m.put("providerId", rs.getString("providerId"));
          m.put("listingId", rs.getString("listingId"));
          m.put("conversationId", rs.getString("conversationId"));
          m.put("providerName", Optional.ofNullable(rs.getString("providerName")).orElse("Trader"));
          Map<String,Object> req = new LinkedHashMap<>();
          req.put("details", rs.getString("reqDetails"));
          req.put("date", rs.getString("reqDate"));
          req.put("time", rs.getString("reqTime"));
          req.put("ack", rs.getInt("reqAck") != 0);
          m.put("request", req);
          out.add(m);
        }
        return out;
      }
    );
    return ResponseEntity.ok(rows);
  }
}
