package com.tradeexchange.api;

import com.tradeexchange.api.dto.TraderProfileRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/trader")
public class TraderProfileController {

  private final JdbcTemplate jdbc;

  public TraderProfileController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  record AuthedUser(String id, String name, String email, String role, String providerPlayerId) {}

  private AuthedUser auth(String authorization){
    if (authorization == null || !authorization.startsWith("Bearer ")) return null;
    String token = authorization.substring(7);
    try{
      return jdbc.query(
        "SELECT users.id, users.name, users.email, users.role, users.providerPlayerId " +
        "FROM sessions JOIN users ON users.id=sessions.userId WHERE sessions.token=?",
        ps -> ps.setString(1, token),
        rs -> rs.next() ? new AuthedUser(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)) : null
      );
    }catch(Exception e){ return null; }
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

  private Object nz(Object o){
    if (o == null) return (o instanceof Number) ? 0 : "";
    return o;
  }
  private int b(Boolean v){ return Boolean.TRUE.equals(v) ? 1 : 0; }
}

