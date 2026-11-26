package com.medmate.clinic.admin.settings;

import com.medmate.clinic.security.CurrentClinic;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The clinic's own settings, the agreements it accepted, and who is signed in. */
@RestController
@RequestMapping("/api/clinic/admin")
public class AdminSettingsController {

    private final AdminSettingsService settings;
    private final CurrentClinic current;

    public AdminSettingsController(AdminSettingsService settings, CurrentClinic current) {
        this.settings = settings;
        this.current = current;
    }

    /** The clinic's own record: its letterhead and what it has agreed to. */
    @GetMapping("/settings")
    public Map<String, Object> settings() {
        return settings.settings(current.get());
    }

    /** Change the clinic's own details. */
    @PutMapping("/settings")
    public Map<String, Object> saveSettings(
            @Valid @RequestBody AdminSettingsService.SettingsRequest request) {
        return settings.saveSettings(current.get(), request);
    }

    /** This device, and the PIN that unlocks the screen. */
    @GetMapping("/settings/device")
    public Map<String, Object> device() {
        return settings.device(current.get());
    }

    /** Set the PIN that unlocks this screen. */
    @PutMapping("/settings/pin")
    public Map<String, Object> savePin(
            @Valid @RequestBody AdminSettingsService.PinRequest request) {
        return settings.savePin(current.get(), request);
    }

    /** The agreements the clinic has been asked to accept. */
    @GetMapping("/settings/agreements")
    public Map<String, Object> agreements() {
        return settings.agreements(current.get());
    }

    /** Accept an agreement. */
    @PutMapping("/settings/agreements/{kind}")
    public Map<String, Object> accept(
            @PathVariable String kind,
            @Valid @RequestBody AdminSettingsService.AcceptRequest request) {
        return settings.accept(current.get(), kind, request);
    }

    /** What is still to do before the clinic sees a patient. */
    @GetMapping("/settings/readiness")
    public Map<String, Object> readiness() {
        return settings.readiness(current.get());
    }

    /** Who is signed in. */
    @GetMapping("/account")
    public Map<String, Object> account() {
        return settings.account(current.get());
    }

    /** Change what the signed-in person is called. */
    @PutMapping("/account")
    public Map<String, Object> saveAccount(
            @Valid @RequestBody AdminSettingsService.AccountRequest request) {
        return settings.saveAccount(current.get(), request);
    }

    /** What the clinic has done, newest first. */
    @GetMapping("/activity")
    public Map<String, Object> activity() {
        return settings.activity(current.get());
    }
}
