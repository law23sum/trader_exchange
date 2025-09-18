package com.tradeexchange.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradeexchange.api.dto.TraderProfileRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/trader")
public class TraderProfileController {

  private final JdbcTemplate jdbc;
  private final String jwtSecret;
  private final ObjectMapper mapper = new ObjectMapper();

  public TraderProfileController(JdbcTemplate jdbc, @Value("${app.jwt.secret:dev-secret}") String jwtSecret) {
    this.jdbc = jdbc;
    this.jwtSecret = (jwtSecret != null && !jwtSecret.isBlank()) ? jwtSecret : "dev-secret";
  }

  record AuthedUser(String id, String name, String email, String role, String providerPlayerId) {}

  private AuthedUser auth(String authorization){
    if (authorization == null || !authorization.startsWith("Bearer ")) return null;
    String token = authorization.substring(7).trim();
    if (token.isEmpty()) return null;
    Map<String, Object> payload = decodeJwt(token);
    if (payload == null) return null;
    String userId = stringValue(payload.get("sub"));
    String email = stringValue(payload.get("email"));
    AuthedUser user = lookupUser(userId, email);
    if (user != null) return user;
    return null;
  }

  private AuthedUser lookupUser(String id, String email){
    try{
      if (id != null && !id.isBlank()){
        AuthedUser u = jdbc.query(
          "SELECT id,name,email,role,providerPlayerId FROM users WHERE id=?",
          ps -> ps.setString(1, id),
          rs -> rs.next() ? new AuthedUser(rs.getString("id"), rs.getString("name"), rs.getString("email"), rs.getString("role"), rs.getString("providerPlayerId")) : null
        );
        if (u != null) return normalizeRole(u);
      }
    }catch(Exception ignored){}
    try{
      if (email != null && !email.isBlank()){
        AuthedUser u = jdbc.query(
          "SELECT id,name,email,role,providerPlayerId FROM users WHERE lower(email)=lower(?)",
          ps -> ps.setString(1, email),
          rs -> rs.next() ? new AuthedUser(rs.getString("id"), rs.getString("name"), rs.getString("email"), rs.getString("role"), rs.getString("providerPlayerId")) : null
        );
        if (u != null) return normalizeRole(u);
      }
    }catch(Exception ignored){}
    return null;
  }

  private AuthedUser normalizeRole(AuthedUser user){
    if (user == null) return null;
    String role = user.role() != null ? user.role().toUpperCase() : null;
    return new AuthedUser(user.id(), user.name(), user.email(), role, user.providerPlayerId());
  }

  private Map<String, Object> decodeJwt(String token){
    try{
      String[] parts = token.split("\\.");
      if (parts.length != 3) return null;
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] signature = mac.doFinal((parts[0] + "." + parts[1]).getBytes(StandardCharsets.UTF_8));
      String expected = Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
      if (!MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) return null;
      byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
      @SuppressWarnings("unchecked")
      Map<String, Object> payload = mapper.readValue(payloadBytes, Map.class);
      Object exp = payload.get("exp");
      if (exp instanceof Number num){
        if (Instant.now().getEpochSecond() > num.longValue()) return null;
      } else if (exp instanceof String str && !str.isBlank()){
        long ts = Long.parseLong(str.trim());
        if (Instant.now().getEpochSecond() > ts) return null;
      }
      return payload;
    }catch(Exception e){
      return null;
    }
  }

  private String stringValue(Object value){
    if (value == null) return null;
    String s = String.valueOf(value);
    return s != null && !s.isBlank() ? s : null;
  }

  @GetMapping("/profile")
  public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authz){
    AuthedUser u = auth(authz);
    if (u == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","No token"));
    if (!"TRADER".equals(u.role())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","Not a trader"));

    if (u.providerPlayerId() == null){
      return ResponseEntity.ok(Map.of(
        "id", null,
        "name", u.name(),
        "bio", "",
        "location", "",
        "website", "",
        "phone", "",
        "specialties", "",
        "hourlyRate", 0,
        "availability", "",
        "experienceYears", 0,
        "languages", "",
        "certifications", "",
        "socialTwitter", "",
        "socialInstagram", "",
        "portfolio", "",
        "sessionLength", "",
        "editedPhotos", 0,
        "delivery", "",
        "turnaround", "",
        "onLocation", true,
        "studioAvailable", false,
        "travelRadius", "",
        "styles", "",
        "equipment", ""
      ));
    }

    String sql = "SELECT id,name,bio,location,website,phone,specialties,hourlyRate,availability,experienceYears,languages,certifications,socialTwitter,socialInstagram,portfolio,sessionLength,editedPhotos,delivery,turnaround,onLocation,studioAvailable,travelRadius,styles,equipment FROM players WHERE id=?";
    Map<String,Object> row = jdbc.query(sql, ps -> ps.setString(1, u.providerPlayerId()), rs -> {
      if (!rs.next()) return null;
      return Map.of(
        "id", rs.getString("id"),
        "name", rs.getString("name"),
        "bio", rs.getString("bio"),
        "location", rs.getString("location"),
        "website", rs.getString("website"),
        "phone", rs.getString("phone"),
        "specialties", rs.getString("specialties"),
        "hourlyRate", rs.getDouble("hourlyRate"),
        "availability", rs.getString("availability"),
        "experienceYears", rs.getInt("experienceYears"),
        "languages", rs.getString("languages"),
        "certifications", rs.getString("certifications"),
        "socialTwitter", rs.getString("socialTwitter"),
        "socialInstagram", rs.getString("socialInstagram"),
        "portfolio", rs.getString("portfolio"),
        "sessionLength", rs.getString("sessionLength"),
        "editedPhotos", rs.getInt("editedPhotos"),
        "delivery", rs.getString("delivery"),
        "turnaround", rs.getString("turnaround"),
        "onLocation", rs.getInt("onLocation") != 0,
        "studioAvailable", rs.getInt("studioAvailable") != 0,
        "travelRadius", rs.getString("travelRadius"),
        "styles", rs.getString("styles"),
        "equipment", rs.getString("equipment")
      );
    });
    if (row == null) return ResponseEntity.ok(Map.of("id", null));
    return ResponseEntity.ok(row);
  }

  @PostMapping("/profile")
  public ResponseEntity<?> saveProfile(@RequestHeader(value = "Authorization", required = false) String authz,
                                       @RequestBody TraderProfileRequest req){
    AuthedUser u = auth(authz);
    if (u == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error","No token"));
    if (!"TRADER".equals(u.role())) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","Not a trader"));

    String pid = u.providerPlayerId();
    try{
      jdbc.execute("BEGIN");
      if (pid == null){
        pid = java.util.UUID.randomUUID().toString().replace("-", "").substring(0,8);
        jdbc.update("INSERT INTO players (id,name,role,rating,jobs,bio) VALUES (?,?,?,?,?,?)",
          pid, u.name(), "PROVIDER", 5.0, 0, req.bio != null ? req.bio : "");
        // link to user if column exists
        try {
          jdbc.update("UPDATE users SET providerPlayerId=? WHERE id=?", pid, u.id());
        }catch(Exception ignore){}
      }
      jdbc.update("UPDATE players SET bio=?, location=?, website=?, phone=?, specialties=?, hourlyRate=?, availability=?, experienceYears=?, languages=?, certifications=?, socialTwitter=?, socialInstagram=?, portfolio=?, sessionLength=?, editedPhotos=?, delivery=?, turnaround=?, onLocation=?, studioAvailable=?, travelRadius=?, styles=?, equipment=? WHERE id=?",
        nz(req.bio), nz(req.location), nz(req.website), nz(req.phone), nz(req.specialties), nz(req.hourlyRate), nz(req.availability), nz(req.experienceYears), nz(req.languages), nz(req.certifications), nz(req.socialTwitter), nz(req.socialInstagram), nz(req.portfolio), nz(req.sessionLength), nz(req.editedPhotos), nz(req.delivery), nz(req.turnaround), b(req.onLocation), b(req.studioAvailable), nz(req.travelRadius), nz(req.styles), nz(req.equipment), pid
      );
      jdbc.execute("COMMIT");
      return ResponseEntity.ok(Map.of("ok", true));
    }catch(Exception e){
      try{ jdbc.execute("ROLLBACK"); }catch(Exception ignore){}
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","Failed to save"));
    }
  }

  private String nz(String value){
    return value != null ? value : "";
  }

  private double nz(Double value){
    return value != null ? value : 0.0;
  }

  private int nz(Integer value){
    return value != null ? value : 0;
  }
  private int b(Boolean v){ return Boolean.TRUE.equals(v) ? 1 : 0; }
}

