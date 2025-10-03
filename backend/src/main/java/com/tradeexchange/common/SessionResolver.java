package com.tradeexchange.common;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class SessionResolver {

  public record UserSession(String id, String name, String email, String role, String providerPlayerId) {}

  private final JdbcTemplate jdbc;

  public SessionResolver(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<UserSession> fromAuthorization(String authorizationHeader) {
    String token = extractToken(authorizationHeader);
    if (token.isEmpty()) return Optional.empty();
    return fromToken(token);
  }

  public Optional<UserSession> fromToken(String token) {
    if (token == null || token.isBlank()) return Optional.empty();
    try {
      return jdbc.query(
        "SELECT u.id, u.name, u.email, u.role, u.providerPlayerId FROM sessions s JOIN users u ON u.id = s.userId WHERE s.token = ?",
        ps -> ps.setString(1, token),
        rs -> {
          if (!rs.next()) return Optional.empty();
          String role = Optional.ofNullable(rs.getString("role")).map(String::toUpperCase).orElse("USER");
          return Optional.of(new UserSession(
            rs.getString("id"),
            rs.getString("name"),
            rs.getString("email"),
            role,
            rs.getString("providerPlayerId")
          ));
        }
      );
    } catch (Exception e) {
      return Optional.empty();
    }
  }

  public String extractToken(String authorizationHeader){
    if (authorizationHeader == null) return "";
    if (authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
      return authorizationHeader.substring(7).trim();
    }
    return authorizationHeader.trim();
  }
}
