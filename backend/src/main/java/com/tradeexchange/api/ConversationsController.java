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
public class ConversationsController {
  private final org.springframework.jdbc.core.JdbcTemplate jdbc;
  private final SessionResolver sessions;

  public ConversationsController(org.springframework.jdbc.core.JdbcTemplate jdbc, SessionResolver sessions){
    this.jdbc = jdbc;
    this.sessions = sessions;
  }

  private ResponseEntity<Map<String,String>> unauthorized(){
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
  }

  @GetMapping("/conversations")
  public ResponseEntity<?> list(@RequestHeader(value = "Authorization", required = false) String authz){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return unauthorized();

    var rows = jdbc.query(
      "SELECT DISTINCT c.id, c.kind, c.title, c.createdAt, c.lastMessage " +
      "FROM conversations c " +
      "JOIN messages m ON m.conversationId = c.id " +
      "WHERE m.userId = ? " +
      "ORDER BY c.createdAt DESC",
      ps -> ps.setString(1, session.get().id()),
      rs -> {
        List<Map<String,Object>> out = new ArrayList<>();
        while (rs.next()){
          Map<String,Object> row = new LinkedHashMap<>();
          row.put("id", rs.getString("id"));
          row.put("kind", rs.getString("kind"));
          row.put("title", rs.getString("title"));
          row.put("createdAt", rs.getString("createdAt"));
          row.put("lastMessage", rs.getString("lastMessage"));
          out.add(row);
        }
        return out;
      }
    );
    return ResponseEntity.ok(rows);
  }

  public record NewConversation(String kind, String title, String providerId){}
  @PostMapping("/conversations")
  public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String authz,
                                  @RequestBody NewConversation req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return unauthorized();

    String id = UUID.randomUUID().toString().substring(0,8);
    String kind = Optional.ofNullable(req.kind()).orElse("CHAT");
    String title = Optional.ofNullable(req.title()).orElse("Chat");
    String createdAt = Instant.now().toString();
    jdbc.update("INSERT INTO conversations (id,kind,title,createdAt,lastMessage) VALUES (?,?,?,?,?)",
      id, kind, title, createdAt, ""
    );
    // Link the creator to this conversation by inserting a system marker message
    jdbc.update(
      "INSERT INTO messages (id, conversationId, userId, role, content, createdAt) VALUES (?,?,?,?,?,?)",
      UUID.randomUUID().toString().substring(0,8), id, session.get().id(), "system", "", createdAt
    );
    // If a provider is specified, link the provider's trader user to this conversation
    String providerId = Optional.ofNullable(req.providerId()).orElse("");
    if (!providerId.isBlank()){
      try{
        List<String> traderUserIds = jdbc.query(
          "SELECT id FROM users WHERE providerPlayerId=?",
          ps -> ps.setString(1, providerId),
          rs -> { java.util.List<String> out = new java.util.ArrayList<>(); while (rs.next()) out.add(rs.getString(1)); return out; }
        );
        for (String tuid : traderUserIds){
          if (tuid!=null && !tuid.isBlank()){
            jdbc.update(
              "INSERT INTO messages (id, conversationId, userId, role, content, createdAt) VALUES (?,?,?,?,?,?)",
              UUID.randomUUID().toString().substring(0,8), id, tuid, "system", "", createdAt
            );
          }
        }
      }catch(Exception ignore){}
    }
    return ResponseEntity.ok(Map.of(
      "id", id,
      "kind", kind,
      "title", title,
      "createdAt", createdAt,
      "lastMessage", ""
    ));
  }

  @GetMapping("/conversations/{id}/messages")
  public ResponseEntity<?> getMessages(@RequestHeader(value = "Authorization", required = false) String authz,
                                       @PathVariable String id){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return unauthorized();
    // Enforce access: user must be associated with this conversation via messages
    Integer hasAccess = jdbc.query(
      "SELECT 1 FROM messages WHERE conversationId=? AND userId=? LIMIT 1",
      ps -> { ps.setString(1, id); ps.setString(2, session.get().id()); },
      rs -> rs.next() ? 1 : 0
    );
    if (hasAccess == 0) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","No access"));

    var rows = jdbc.query("SELECT id,conversationId,userId,role,content,createdAt FROM messages WHERE conversationId=? ORDER BY createdAt ASC",
      ps -> ps.setString(1,id),
      rs -> {
        List<Map<String,Object>> out = new ArrayList<>();
        while (rs.next()){
          Map<String,Object> row = new LinkedHashMap<>();
          row.put("id", rs.getString("id"));
          row.put("conversationId", rs.getString("conversationId"));
          row.put("userId", rs.getString("userId"));
          row.put("role", rs.getString("role"));
          row.put("content", rs.getString("content"));
          row.put("createdAt", rs.getString("createdAt"));
          out.add(row);
        }
        return out;
      }
    );
    return ResponseEntity.ok(rows);
  }

  public record NewMessage(String content){}
  @PostMapping("/conversations/{id}/messages")
  public ResponseEntity<?> postMessage(@RequestHeader(value = "Authorization", required = false) String authz,
                                       @PathVariable String id,
                                       @RequestBody NewMessage req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return unauthorized();
    UserSession user = session.get();

    // Enforce access: user must be associated with this conversation via messages
    Integer hasAccess = jdbc.query(
      "SELECT 1 FROM messages WHERE conversationId=? AND userId=? LIMIT 1",
      ps -> { ps.setString(1, id); ps.setString(2, user.id()); },
      rs -> rs.next() ? 1 : 0
    );
    if (hasAccess == 0) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","No access"));

    String content = Optional.ofNullable(req.content()).orElse("");
    String now = Instant.now().toString();
    String mid = UUID.randomUUID().toString().substring(0,8);
    jdbc.update("INSERT INTO messages (id,conversationId,userId,role,content,createdAt) VALUES (?,?,?,?,?,?)",
      mid, id, user.id(), "user", content, now
    );
    jdbc.update("UPDATE conversations SET lastMessage=? WHERE id=?", content, id);

    Map<String,Object> message = Map.of(
      "id", mid,
      "conversationId", id,
      "userId", user.id(),
      "role", "user",
      "content", content,
      "createdAt", now
    );
    return ResponseEntity.ok(Map.of("ok", true, "message", message));
  }
}
