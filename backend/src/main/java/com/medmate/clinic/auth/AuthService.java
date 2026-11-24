package com.medmate.clinic.auth;

import com.medmate.clinic.common.UnauthorizedException;
import com.medmate.clinic.grant.GrantService;
import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.JwtService;
import com.medmate.clinic.staff.Staff;
import com.medmate.clinic.staff.StaffRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Signing in: a code, then a PIN, then a session. */
@Service
public class AuthService {

    private final StaffRepository staffRepository;
    private final OtpService otpService;
    private final PinService pinService;
    private final GrantService grantService;
    private final JwtService jwtService;

    public AuthService(
            StaffRepository staffRepository,
            OtpService otpService,
            PinService pinService,
            GrantService grantService,
            JwtService jwtService) {
        this.staffRepository = staffRepository;
        this.otpService = otpService;
        this.pinService = pinService;
        this.grantService = grantService;
        this.jwtService = jwtService;
    }

    /** Send a code to a mobile number. */
    @Transactional(readOnly = true)
    public OtpService.Issued requestCode(String phone) {
        requireStaffFor(phone);
        return otpService.issue(phone);
    }

    /** Check the code and open a session. */
    @Transactional(readOnly = true)
    public String openSession(String phone, String code) {
        Staff staff = requireStaffFor(phone);
        if (!otpService.verify(phone, code)) {
            throw new UnauthorizedException("That code has expired. Ask for a new one.");
        }
        return jwtService.issue(principalFor(staff));
    }

    /** Unlock a device with the PIN. */
    @Transactional(readOnly = true)
    public String unlock(UUID clinicId, String pin) {
        for (Staff staff : staffRepository.findByClinicId(clinicId)) {
            if (pinService.matches(staff.getId().toString(), staff.getPinHash(), pin)) {
                return jwtService.issue(principalFor(staff));
            }
        }
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

    /**
     * The person behind a mobile number.
     *
     * <p>A number is unique inside a clinic, not across clinics, so the number
     * alone does not name a clinic. Until the sign-in flow carries a clinic, the
     * first clinic that has this number is used.
     */
    private Staff requireStaffFor(String phone) {
        return staffRepository.findAll().stream()
                .filter(staff -> staff.getMobile().equals(phone))
                .findFirst()
                .orElseThrow(() -> new UnauthorizedException("That number is not registered with a clinic."));
    }
}
