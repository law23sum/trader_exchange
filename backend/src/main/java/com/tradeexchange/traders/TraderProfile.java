package com.tradeexchange.traders;

import com.tradeexchange.auth.Account;
import jakarta.persistence.*;

@Entity
public class TraderProfile {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @OneToOne(optional = false)
  private Account account;
  private String tagline;
  @Column(columnDefinition="text") private String bio;
  private Integer hourlyRate;
  private String serviceArea;
  private String links; // CSV or JSON (expand later)

  public Long getId() { return id; }
  public Account getAccount() { return account; }
  public void setAccount(Account account) { this.account = account; }
  public String getTagline() { return tagline; }
  public void setTagline(String tagline) { this.tagline = tagline; }
  public String getBio() { return bio; }
  public void setBio(String bio) { this.bio = bio; }
  public Integer getHourlyRate() { return hourlyRate; }
  public void setHourlyRate(Integer hourlyRate) { this.hourlyRate = hourlyRate; }
  public String getServiceArea() { return serviceArea; }
  public void setServiceArea(String serviceArea) { this.serviceArea = serviceArea; }
  public String getLinks() { return links; }
  public void setLinks(String links) { this.links = links; }
}

