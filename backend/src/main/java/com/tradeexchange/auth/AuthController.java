package com.tradeexchange.auth;

import com.tradeexchange.common.dto.ApiError;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AccountRepository accounts;

  public AuthController(AccountRepository accounts) {
    this.accounts = accounts;
  }

  public record RegisterRequest(String email, String password, String role) {}
  public record LoginRequest(String email, String password) {}

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody RegisterRequest req){
    if (req.email()==null || req.email().isBlank()) return ResponseEntity.badRequest().body(new ApiError("Email required"));
    if (accounts.findByEmail(req.email()).isPresent()) return ResponseEntity.status(409).body(new ApiError("Email already exists"));
    Account a = new Account(); a.setEmail(req.email()); a.setPasswordHash("{noop}" + (req.password()==null?"":req.password()));
    try{ a.setRole(Role.valueOf((req.role()==null?"USER":req.role()).toUpperCase())); }catch(Exception ignore){ a.setRole(Role.USER);} 
    accounts.save(a);
    return ResponseEntity.ok(Map.of("id", a.getId(), "email", a.getEmail(), "role", a.getRole().name()));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginRequest req){
    var opt = accounts.findByEmail(req.email());
    if (opt.isEmpty()) {
      return ResponseEntity.status(401).body(new ApiError("Invalid credentials"));
    }
    var a = opt.get();
    return ResponseEntity.ok(Map.of(
      "token","dev-token",
      "account", Map.of(
        "id",a.getId(),
        "email",a.getEmail(),
        "role",a.getRole().name(),
        "providerId", a.getProviderId()
      )
    ));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(){
    // Stub: in real implementation, extract from JWT. For now, return anonymous.
    return ResponseEntity.ok(Map.of("id", 0, "email", "anonymous@example.com", "role", "USER"));
  }
}
