package com.tradeexchange.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping
public class HealthController {

  @GetMapping({"/api/health", "/health"})
  public ResponseEntity<Map<String,Object>> health(){
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @RequestMapping(value = {"/api/health", "/health"}, method = RequestMethod.HEAD)
  public ResponseEntity<Void> healthHead(){
    return ResponseEntity.ok().build();
  }
}
