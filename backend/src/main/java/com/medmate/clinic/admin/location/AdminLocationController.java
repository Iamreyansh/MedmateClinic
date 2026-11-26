package com.medmate.clinic.admin.location;

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

/** The clinic's branches: the places it works from. */
@RestController
@RequestMapping("/api/clinic/admin/locations")
public class AdminLocationController {

    private final AdminLocationService locations;
    private final CurrentClinic current;

    public AdminLocationController(AdminLocationService locations, CurrentClinic current) {
        this.locations = locations;
        this.current = current;
    }

    /** The clinic's branches. */
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String search) {
        return locations.list(current.get(), search);
    }

    /** Add a branch. */
    @PostMapping
    public Map<String, Object> add(@Valid @RequestBody AdminLocationService.BranchRequest request) {
        return locations.add(current.get(), request);
    }

    /** Change what is known about a branch. */
    @PutMapping("/{branchId}")
    public Map<String, Object> update(
            @PathVariable UUID branchId,
            @Valid @RequestBody AdminLocationService.BranchRequest request) {
        return locations.update(current.get(), branchId, request);
    }

    /** Remove a branch that nothing is attached to. */
    @DeleteMapping("/{branchId}")
    public Map<String, Object> remove(@PathVariable UUID branchId) {
        return locations.remove(current.get(), branchId);
    }
}
