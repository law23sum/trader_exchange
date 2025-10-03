package com.tradeexchange.traders;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
public class ServiceOffering {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @ManyToOne(optional = false)
  private TraderProfile trader;
  @Column(nullable = false)
  private String title;
  @Column(columnDefinition = "text")
  private String description;
  @Column(nullable = false)
  private BigDecimal price;
  private String status = "DRAFT"; // DRAFT|LIVE
  private String tags; // CSV for v1
  private Instant createdAt = Instant.now();

  public Long getId() { return id; }
  public TraderProfile getTrader() { return trader; }
  public void setTrader(TraderProfile trader) { this.trader = trader; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public BigDecimal getPrice() { return price; }
  public void setPrice(BigDecimal price) { this.price = price; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getTags() { return tags; }
  public void setTags(String tags) { this.tags = tags; }
  public Instant getCreatedAt() { return createdAt; }
}

