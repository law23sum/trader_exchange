package com.tradeexchange.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "account", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
public class Account {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false)
  private String email;
  private String passwordHash; // nullable for OAuth accounts
  @Enumerated(EnumType.STRING)
  private Role role = Role.USER;
  private String authProvider; // LOCAL / GOOGLE
  private Instant createdAt = Instant.now();

  private String providerId; // link to TraderProfile/provider row id (string for flexibility)

  public Long getId() { return id; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public Role getRole() { return role; }
  public void setRole(Role role) { this.role = role; }
  public String getAuthProvider() { return authProvider; }
  public void setAuthProvider(String authProvider) { this.authProvider = authProvider; }
  public Instant getCreatedAt() { return createdAt; }
  public String getProviderId() { return providerId; }
  public void setProviderId(String providerId) { this.providerId = providerId; }
}

