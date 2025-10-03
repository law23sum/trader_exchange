package com.tradeexchange.traders;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class TraderController {

  @GetMapping("/traders/{id}")
  public ResponseEntity<?> publicProfile(@PathVariable Long id){
    // Placeholder: return minimal model for now
    return ResponseEntity.ok(Map.of(
      "id", id,
      "profile", Map.of("tagline","","bio","","serviceArea",""),
      "services", List.of()
    ));
  }

  public record UpsertServiceRequest(String title, String description, BigDecimal price, String tags, String status) {}

  @PutMapping("/traders/me")
  public ResponseEntity<?> updateMyProfile(@RequestBody Map<String, Object> req){
    // TODO integrate with persistence
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @PostMapping("/traders/me/services")
  public ResponseEntity<?> createService(@RequestBody UpsertServiceRequest req){
    return ResponseEntity.ok(Map.of("id", 1, "title", req.title()));
  }

  @PutMapping("/traders/me/services/{id}")
  public ResponseEntity<?> updateService(@PathVariable Long id, @RequestBody UpsertServiceRequest req){
    return ResponseEntity.ok(Map.of("id", id, "title", req.title()));
  }
}

