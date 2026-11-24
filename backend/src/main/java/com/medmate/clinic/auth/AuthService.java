package com.medmate.clinic.auth;

import com.medmate.clinic.audit.AuditService;
import com.medmate.clinic.common.UnauthorizedException;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.JwtService;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import com.medmate.clinic.tenancy.ClinicRouting;
import com.medmate.clinic.tenancy.RegistryClinic;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Signing in: a code, then a session. */
@Service
public class AuthService {

    private final StaffRepository staffRepository;
    private final OtpService otpService;
    private final PinService pinService;
    private final GrantService grantService;
    private final JwtService jwtService;
    private final ClinicRouting routing;
    private final AuditService audit;

    public AuthService(
            StaffRepository staffRepository,
            OtpService otpService,
            PinService pinService,
            GrantService grantService,
            JwtService jwtService,
            ClinicRouting routing,
            AuditService audit) {
        this.staffRepository = staffRepository;
        this.otpService = otpService;
        this.pinService = pinService;
        this.grantService = grantService;
        this.jwtService = jwtService;
        this.routing = routing;
        this.audit = audit;
    }

    /** Send a code to a mobile number. */
    @Transactional(readOnly = true)
    public OtpService.Issued requestCode(String phone) {
        routing.routeByPhone(phone);
        requireStaffFor(phone);
        return otpService.issue(phone);
    }

    /** Check the code and open a session. */
    @Transactional(readOnly = true)
    public String openSession(String phone, String code) {
        RegistryClinic clinic = routing.routeByPhone(phone);
        Staff staff = requireStaffFor(phone);
        if (!otpService.verify(phone, code)) {
            audit.record(
                    clinic.getId(),
                    staff.getId(),
                    null,
                    "auth.sign_in_failed",
                    "session",
                    staff.getId().toString(),
                    Map.of("phone", phone));
            throw new UnauthorizedException("That code has expired. Ask for a new one.");
        }
        String token = jwtService.issue(principalFor(staff));
        audit.record(
                clinic.getId(),
                staff.getId(),
                null,
                "auth.sign_in",
                "session",
                staff.getId().toString(),
                Map.of("mobile", phone));
        return token;
    }

    /** Unlock a device with the PIN. */
    @Transactional(readOnly = true)
    public String unlock(UUID clinicId, String pin) {
        routing.route(clinicId);
        for (Staff staff : staffRepository.findByClinicId(clinicId)) {
            if (pinService.matches(staff.getId().toString(), staff.getPinHash(), pin)) {
                String token = jwtService.issue(principalFor(staff));
                audit.record(
                        clinicId,
                        staff.getId(),
                        null,
                        "auth.unlock",
                        "device",
                        staff.getId().toString(),
                        Map.of());
                return token;
            }
        }
        audit.record(clinicId, null, null, "auth.unlock_failed", "device", null, Map.of());
        throw new UnauthorizedException("That PIN is not right.");
    }

    public ClinicPrincipal principalFor(Staff staff) {
        List<String> capabilities = grantService.resourcesFor(staff.getClinicId(), staff.getRoleId());
        return new ClinicPrincipal(
                staff.getId().toString(),
                staff.getClinicId().toString(),
                roleName(staff),
                capabilities);
    }

    private String roleName(Staff staff) {
        return staff.getRoleId() == null ? "staff" : staff.getRoleId().toString();
    }

    /** The person behind a mobile number, inside the clinic's schema. */
    private Staff requireStaffFor(String phone) {
        return staffRepository.findAll().stream()
                .filter(staff -> staff.getMobile().equals(phone))
                .findFirst()
                .orElseThrow(() -> new UnauthorizedException("That number is not registered with a clinic."));
    }

    /** The detail a signed-in person sees about themselves. */
    public Map<String, Object> sessionFor(Staff staff) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("staffId", staff.getId().toString());
        body.put("name", staff.getFullName());
        return body;
    }
}
