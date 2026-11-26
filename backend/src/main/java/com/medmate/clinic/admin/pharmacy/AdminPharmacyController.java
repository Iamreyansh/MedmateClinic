package com.medmate.clinic.admin.pharmacy;

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

/**
 * The pharmacies the clinic sends prescriptions to.
 *
 * <p>The panel that adds and edits them was built against the mock, and the
 * mock answers these paths — so the service declares them too, or the panel
 * would work against the mock and 404 against the real thing.
 */
@RestController
@RequestMapping("/api/clinic/admin/pharmacies")
public class AdminPharmacyController {

    private final AdminPharmacyService pharmacies;
    private final CurrentClinic current;

    public AdminPharmacyController(AdminPharmacyService pharmacies, CurrentClinic current) {
        this.pharmacies = pharmacies;
        this.current = current;
    }

    /** The clinic's pharmacies. */
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String search) {
        return pharmacies.list(current.get(), search);
    }

    /** Add a pharmacy the clinic sends prescriptions to. */
    @PostMapping
    public Map<String, Object> add(@Valid @RequestBody AdminPharmacyService.PharmacyRequest request) {
        return pharmacies.add(current.get(), request);
    }

    /** Change what is known about a pharmacy. */
    @PutMapping("/{pharmacyId}")
    public Map<String, Object> update(
            @PathVariable UUID pharmacyId,
            @Valid @RequestBody AdminPharmacyService.PharmacyRequest request) {
        return pharmacies.update(current.get(), pharmacyId, request);
    }

    /** Take a pharmacy off the list. */
    @DeleteMapping("/{pharmacyId}")
    public Map<String, Object> remove(@PathVariable UUID pharmacyId) {
        return pharmacies.remove(current.get(), pharmacyId);
    }
}
