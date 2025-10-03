package com.tradeexchange.bookings;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
public class BookingController {

  public record CreateBookingDto(Long serviceId) {}

  @PostMapping
  public ResponseEntity<?> create(@RequestBody CreateBookingDto req){
    return ResponseEntity.ok(Map.of("id", 1, "status", "PENDING"));
  }

  @PostMapping("/{id}/confirm")
  public ResponseEntity<?> confirm(@PathVariable Long id){
    return ResponseEntity.ok(Map.of("checkoutUrl", "https://checkout.stripe.com/test"));
  }
}

