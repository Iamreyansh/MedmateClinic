package com.medmate.clinic.admin.profile;

import com.medmate.clinic.security.CurrentClinic;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The profiles the clinic adds people from. */
@RestController
@RequestMapping("/api/clinic/admin/profiles")
public class AdminProfileController {

    private final AdminProfileService profiles;
    private final CurrentClinic current;

    public AdminProfileController(AdminProfileService profiles, CurrentClinic current) {
        this.profiles = profiles;
        this.current = current;
    }

    /** The clinic's profiles. */
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String search) {
        return profiles.list(current.get(), search);
    }

    /** Add a profile. */
    @PostMapping
    public Map<String, Object> add(@Valid @RequestBody AdminProfileService.ProfileRequest request) {
        return profiles.add(current.get(), request);
    }

    /** Change a profile. */
    @PutMapping("/{profileId}")
    public Map<String, Object> update(
            @PathVariable UUID profileId,
            @Valid @RequestBody AdminProfileService.ProfileRequest request) {
        return profiles.update(current.get(), profileId, request);
    }

    /** Remove a profile. */
    @DeleteMapping("/{profileId}")
    public Map<String, Object> remove(@PathVariable UUID profileId) {
        return profiles.remove(current.get(), profileId);
    }
}
