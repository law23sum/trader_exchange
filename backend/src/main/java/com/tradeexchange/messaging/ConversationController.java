package com.tradeexchange.messaging;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ConversationController {

  @PostMapping("/conversations")
  public ResponseEntity<?> createConversation(@RequestBody Map<String,Object> req){
    return ResponseEntity.ok(Map.of("id", 1));
  }

  @GetMapping("/conversations/{id}/messages")
  public ResponseEntity<?> listMessages(@PathVariable Long id){
    return ResponseEntity.ok(List.of());
  }

  public record NewMessage(String content){}
  @PostMapping("/conversations/{id}/messages")
  public ResponseEntity<?> postMessage(@PathVariable Long id, @RequestBody NewMessage req){
    return ResponseEntity.ok(Map.of("ok", true));
  }
}

