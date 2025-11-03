package com.tradeexchange.api;

import com.tradeexchange.api.dto.TraderProfileRequest;
import com.tradeexchange.common.SessionResolver;
import com.tradeexchange.common.SessionResolver.UserSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/trader")
public class TraderProfileController {

  private final JdbcTemplate jdbc;
  private final SessionResolver sessions;

  public TraderProfileController(JdbcTemplate jdbc, SessionResolver sessions) {
    this.jdbc = jdbc;
    this.sessions = sessions;
  }

  @GetMapping("/profile")
  public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authz){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();
    if (!"TRADER".equalsIgnoreCase(user.role())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not a trader"));

    String providerId = user.providerPlayerId();
    Map<String,Object> profile = loadProfile(providerId, user);
    return ResponseEntity.ok(profile);
  }

  @PostMapping("/profile")
  public ResponseEntity<?> saveProfile(@RequestHeader(value = "Authorization", required = false) String authz,
                                       @RequestBody TraderProfileRequest req){
    Optional<UserSession> session = sessions.fromAuthorization(authz);
    if (session.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No token"));
    UserSession user = session.get();
    if (!"TRADER".equalsIgnoreCase(user.role())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not a trader"));

    String providerId = ensureProviderForUser(user);
    String name = fallbackName(user);

    jdbc.update("UPDATE players SET name=?, bio=?, location=?, website=?, phone=?, specialties=?, hourlyRate=?, availability=?, experienceYears=?, languages=?, certifications=?, socialTwitter=?, socialInstagram=?, portfolio=?, sessionLength=?, editedPhotos=?, delivery=?, turnaround=?, onLocation=?, studioAvailable=?, travelRadius=?, styles=?, equipment=?, updatedAt=? WHERE id=?",
      name,
      safeText(req.bio),
      safeText(req.location),
      safeText(req.website),
      safeText(req.phone),
      safeText(req.specialties),
      safeNumber(req.hourlyRate),
      safeText(req.availability),
      safeInteger(req.experienceYears),
      safeText(req.languages),
      safeText(req.certifications),
      safeText(req.socialTwitter),
      safeText(req.socialInstagram),
      safeText(req.portfolio),
      safeText(req.sessionLength),
      safeInteger(req.editedPhotos),
      safeText(req.delivery),
      safeText(req.turnaround),
      bool(req.onLocation),
      bool(req.studioAvailable),
      safeText(req.travelRadius),
      safeText(req.styles),
      safeText(req.equipment),
      Instant.now().toString(),
      providerId
    );

    Map<String,Object> profile = loadProfile(providerId, user);
    return ResponseEntity.ok(profile);
  }

  private Map<String,Object> loadProfile(String providerId, UserSession user){
    if (providerId == null || providerId.isBlank()) return blankProfile(user);

    Map<String,Object> profile = jdbc.query(
      "SELECT id,name,bio,location,website,phone,specialties,hourlyRate,availability,experienceYears,languages,certifications,socialTwitter,socialInstagram,portfolio,sessionLength,editedPhotos,delivery,turnaround,onLocation,studioAvailable,travelRadius,styles,equipment,rating,jobs " +
      "FROM players WHERE id=?",
      ps -> ps.setString(1, providerId),
      rs -> {
        if (!rs.next()) return null;
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", rs.getString("id"));
        m.put("name", rs.getString("name"));
        m.put("bio", rs.getString("bio"));
        m.put("location", rs.getString("location"));
        m.put("website", rs.getString("website"));
        m.put("phone", rs.getString("phone"));
        m.put("specialties", rs.getString("specialties"));
        m.put("hourlyRate", rs.getObject("hourlyRate"));
        m.put("availability", rs.getString("availability"));
        m.put("experienceYears", rs.getObject("experienceYears"));
        m.put("languages", rs.getString("languages"));
        m.put("certifications", rs.getString("certifications"));
        m.put("socialTwitter", rs.getString("socialTwitter"));
        m.put("socialInstagram", rs.getString("socialInstagram"));
        m.put("portfolio", rs.getString("portfolio"));
        m.put("sessionLength", rs.getString("sessionLength"));
        m.put("editedPhotos", rs.getObject("editedPhotos"));
        m.put("delivery", rs.getString("delivery"));
        m.put("turnaround", rs.getString("turnaround"));
        m.put("onLocation", rs.getInt("onLocation") != 0);
        m.put("studioAvailable", rs.getInt("studioAvailable") != 0);
        m.put("travelRadius", rs.getString("travelRadius"));
        m.put("styles", rs.getString("styles"));
        m.put("equipment", rs.getString("equipment"));
        m.put("rating", rs.getObject("rating"));
        m.put("jobs", rs.getObject("jobs"));
        return m;
      }
    );

    if (profile == null) profile = blankProfile(user);
    attachNames(profile, user);
    profile.putIfAbsent("id", providerId);
    return profile;
  }

  private String ensureProviderForUser(UserSession user){
    String providerId = user.providerPlayerId();
    if (providerId != null && !providerId.isBlank()) return providerId;

    providerId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    jdbc.update("INSERT INTO players (id,name,role,rating,jobs,bio,createdAt) VALUES (?,?,?,?,?,?,?)",
      providerId,
      fallbackName(user),
      "PROVIDER",
      5.0,
      0,
      "",
      Instant.now().toString()
    );
    jdbc.update("UPDATE users SET role='TRADER', providerPlayerId=? WHERE id=?",
      providerId,
      user.id()
    );
    return providerId;
  }

  private Map<String,Object> blankProfile(UserSession user){
    Map<String,Object> m = new LinkedHashMap<>();
    m.put("id", null);
    m.put("name", fallbackName(user));
    m.put("bio", "");
    m.put("location", "");
    m.put("website", "");
    m.put("phone", "");
    m.put("specialties", "");
    m.put("hourlyRate", 0);
    m.put("availability", "");
    m.put("experienceYears", 0);
    m.put("languages", "");
    m.put("certifications", "");
    m.put("socialTwitter", "");
    m.put("socialInstagram", "");
    m.put("portfolio", "");
    m.put("sessionLength", "");
    m.put("editedPhotos", 0);
    m.put("delivery", "");
    m.put("turnaround", "");
    m.put("onLocation", true);
    m.put("studioAvailable", false);
    m.put("travelRadius", "");
    m.put("styles", "");
    m.put("equipment", "");
    attachNames(m, user);
    return m;
  }

  private void attachNames(Map<String,Object> profile, UserSession user){
    String baseName = (profile.get("name") instanceof String s && !s.isBlank()) ? s : fallbackName(user);
    if (baseName == null) baseName = "Provider";
    String[] parts = baseName.trim().split("\\s+", 2);
    profile.put("firstName", parts.length > 0 ? parts[0] : "");
    profile.put("lastName", parts.length > 1 ? parts[1] : "");
  }

  private String fallbackName(UserSession user){
    if (user.name() != null && !user.name().isBlank()) return user.name();
    if (user.email() != null && user.email().contains("@")) return user.email().substring(0, user.email().indexOf('@'));
    return "Provider";
  }

  private String safeText(String value){ return value == null ? "" : value.trim(); }
  private Double safeNumber(Double value){ return value == null ? 0.0 : value; }
  private Integer safeInteger(Integer value){ return value == null ? 0 : value; }
  private int bool(Boolean value){ return Boolean.TRUE.equals(value) ? 1 : 0; }
}
