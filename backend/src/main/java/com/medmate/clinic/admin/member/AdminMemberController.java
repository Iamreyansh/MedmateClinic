package com.medmate.clinic.admin.member;

import com.medmate.clinic.security.CurrentClinic;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The clinic's team: the people who work in it, and what each may open. */
@RestController
@RequestMapping("/api/clinic/admin/members")
public class AdminMemberController {

    private final AdminMemberService members;
    private final CurrentClinic current;

    public AdminMemberController(AdminMemberService members, CurrentClinic current) {
        this.members = members;
        this.current = current;
    }

    /** The clinic's team. */
    @GetMapping
    public Map<String, Object> team(@RequestParam(required = false) String search) {
        return members.team(current.get(), search);
    }

    /** Add somebody to the team. */
    @PostMapping
    public Map<String, Object> add(@Valid @RequestBody AdminMemberService.MemberRequest request) {
        return members.add(current.get(), request);
    }

    /** Change what is known about a member of the team. */
    @PutMapping("/{memberId}")
    public Map<String, Object> update(
            @PathVariable UUID memberId,
            @Valid @RequestBody AdminMemberService.MemberRequest request) {
        return members.update(current.get(), memberId, request);
    }

    /** What this person may open. */
    @GetMapping("/{memberId}/access")
    public Map<String, Object> access(@PathVariable UUID memberId) {
        return members.access(current.get(), memberId);
    }

    /** Change what this person may open. */
    @PutMapping("/{memberId}/access")
    public Map<String, Object> saveAccess(
            @PathVariable UUID memberId,
            @Valid @RequestBody AdminMemberService.AccessRequest request) {
        return members.saveAccess(current.get(), memberId, request);
    }
}
