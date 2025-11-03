package com.tradeexchange.api;

import com.tradeexchange.common.SessionResolver;
import com.tradeexchange.common.SessionResolver.UserSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class UserDataController {

  private final JdbcTemplate jdbc;
  private final SessionResolver sessions;

  public UserDataController(JdbcTemplate jdbc, SessionResolver sessions) {
    this.jdbc = jdbc;
    this.sessions = sessions;
  }

  @GetMapping({"/user/favorites", "/favorites"})
  public ResponseEntity<?> favorites(@RequestHeader(value = "Authorization", required = false) String authz){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();

    List<Map<String,Object>> rows = jdbc.query(
      "SELECT f.providerId, p.name, p.role, p.rating, p.jobs, COUNT(i.id) AS interactions " +
      "FROM favorites f " +
      "LEFT JOIN players p ON p.id = f.providerId " +
      "LEFT JOIN interactions i ON i.userId = f.userId AND i.providerId = f.providerId " +
      "WHERE f.userId = ? " +
      "GROUP BY f.providerId, p.name, p.role, p.rating, p.jobs " +
      "ORDER BY interactions DESC",
      ps -> ps.setString(1, user.id()),
      rs -> {
        List<Map<String,Object>> out = new java.util.ArrayList<>();
        while (rs.next()){
          Map<String,Object> provider = new LinkedHashMap<>();
          provider.put("id", rs.getString("providerId"));
          provider.put("name", rs.getString("name"));
          provider.put("role", rs.getString("role"));
          provider.put("rating", rs.getObject("rating"));
          provider.put("jobs", rs.getObject("jobs"));

          Map<String,Object> row = new LinkedHashMap<>();
          row.put("providerId", rs.getString("providerId"));
          row.put("count", rs.getLong("interactions"));
          row.put("provider", provider);
          out.add(row);
        }
        return out;
      }
    );

    return ResponseEntity.ok(rows);
  }

  @GetMapping({"/user/history", "/history"})
  public ResponseEntity<?> history(@RequestHeader(value = "Authorization", required = false) String authz){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();

    List<Map<String,Object>> rows = jdbc.query(
      "SELECT i.id, i.providerId, p.name AS providerName, i.note, i.at, i.amount " +
      "FROM interactions i " +
      "LEFT JOIN players p ON p.id = i.providerId " +
      "WHERE i.userId = ? " +
      "ORDER BY i.at DESC LIMIT 100",
      ps -> ps.setString(1, user.id()),
      rs -> {
        List<Map<String,Object>> out = new java.util.ArrayList<>();
        while (rs.next()){
          Map<String,Object> row = new LinkedHashMap<>();
          row.put("id", rs.getString("id"));
          row.put("providerId", rs.getString("providerId"));
          row.put("providerName", rs.getString("providerName"));
          row.put("note", rs.getString("note"));
          row.put("at", rs.getString("at"));
          row.put("amount", rs.getObject("amount"));
          out.add(row);
        }
        return out;
      }
    );

    return ResponseEntity.ok(rows);
  }
}
