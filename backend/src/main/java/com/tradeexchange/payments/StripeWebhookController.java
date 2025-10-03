package com.tradeexchange.payments;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
public class StripeWebhookController {
  @PostMapping("/webhook")
  public ResponseEntity<?> webhook(@RequestBody String payload, @RequestHeader(value = "Stripe-Signature", required = false) String sig){
    // TODO: verify signature with Stripe SDK
    return ResponseEntity.ok(Map.of("received", true));
  }
}

