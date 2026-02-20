package com.mysticai.astrology.controller;

import com.mysticai.astrology.dto.SavedPersonRequest;
import com.mysticai.astrology.dto.SavedPersonResponse;
import com.mysticai.astrology.service.SavedPersonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/people")
@RequiredArgsConstructor
@Slf4j
public class SavedPersonController {

    private final SavedPersonService savedPersonService;

    /** POST /api/v1/people — add a new important person */
    @PostMapping
    public ResponseEntity<SavedPersonResponse> addPerson(@Valid @RequestBody SavedPersonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPersonService.addPerson(request));
    }

    /** GET /api/v1/people/user/{userId} — list all saved people for a user */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SavedPersonResponse>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(savedPersonService.getByUser(userId));
    }

    /** GET /api/v1/people/{id} — get a single saved person */
    @GetMapping("/{id}")
    public ResponseEntity<SavedPersonResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(savedPersonService.getById(id));
    }

    /** PUT /api/v1/people/{id} — update a saved person */
    @PutMapping("/{id}")
    public ResponseEntity<SavedPersonResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SavedPersonRequest request) {
        return ResponseEntity.ok(savedPersonService.updatePerson(id, request));
    }

    /** DELETE /api/v1/people/{id}?userId={userId} — delete a saved person */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam Long userId) {
        savedPersonService.deletePerson(id, userId);
        return ResponseEntity.noContent().build();
    }
}
