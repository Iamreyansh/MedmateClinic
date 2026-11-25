package com.medmate.clinic.reports;

import com.medmate.clinic.security.ClinicPrincipal;
import com.medmate.clinic.security.CurrentClinic;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The reports.
 *
 * <p>One endpoint, four views: the summary, the bookings and the waiting, the
 * clinical view and the list of consultations. Which views a person may open
 * comes from their capabilities, not from the name of their role.
 */
@RestController
@RequestMapping("/api/clinic/reports")
public class ReportsController {

    private final ReportsService reports;
    private final CurrentClinic current;

    public ReportsController(ReportsService reports, CurrentClinic current) {
        this.reports = reports;
        this.current = current;
    }

    /**
     * The report for a range.
     *
     * @param tab which view to send
     * @param from the first day, as yyyy-mm-dd
     * @param to the last day, as yyyy-mm-dd
     * @param doctor one doctor, or nothing for the whole clinic
     * @param q what to look for in the consultation list
     */
    @GetMapping
    public Map<String, Object> report(
            @RequestParam(required = false) String tab,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String doctor,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset) {
        ClinicPrincipal principal = current.get();
        return reports.report(principal, tab, from, to, doctor, q, limit, offset);
    }
}
