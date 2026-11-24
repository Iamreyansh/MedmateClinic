package com.medmate.clinic.catalogue;

import java.util.List;
import org.springframework.stereotype.Component;

/**
 * The stations of the product.
 *
 * <p>The stations are the product, not the data: what they are called, what
 * they do and which way the patient moves through them do not change per
 * clinic. The numbers on them do.
 */
@Component
public class StationCatalogue {

    public record Station(
            String icon,
            String tone,
            String title,
            String description,
            String tag,
            String countResource) {}

    public record ManageLink(
            String icon, String title, String description, String href, String countResource) {}

    public List<Station> stations() {
        return List.of(
                new Station("kiosk", "blue", "Patient Kiosk",
                        "Patients confirm their mobile, check in for a booking or join the queue, and get a token.",
                        "Step 1", null),
                new Station("nurse", "purple", "Nurse Station",
                        "Record vitals and route each patient to the right doctor.", "Step 2", "nurse"),
                new Station("stetho", "green", "Doctor Console",
                        "Consult, prescribe with smart suggestions, order tests and e-sign.", "Step 3", "console"),
                new Station("inbox", "gold", "Inbox",
                        "Referrals from colleagues, lab results to review and handovers.", "Doctor", "inbox"),
                new Station("print", "blue", "Reception Desk",
                        "Print each signed prescription and hand it to the patient.", "Step 4", "desk"),
                new Station("rupee", "blue", "Billing & POS",
                        "Collect consultation fees, print receipts and close the day.", "Billing", "billing"),
                new Station("lab", "purple", "Lab & Diagnostics",
                        "Collect samples, enter results and report the tests doctors order.", "Diagnostics", "lab"),
                new Station("video", "blue", "Teleconsult",
                        "Video consults: the patient joins from home and the prescription goes out digitally.",
                        "Online", "tele"),
                new Station("cal", "blue", "Appointments",
                        "Book follow-ups and new patients, see the day and check arrivals in.", "Bookings",
                        "appointment"));
    }

    public List<ManageLink> manage() {
        return List.of(
                new ManageLink("chart", "Reports & analytics",
                        "Consultation history, medicine analytics and Excel export.", "/reports", "report"),
                new ManageLink("folder", "Patients & Rx",
                        "Find a patient, their record, prescriptions and certificates.", "/patients", "patient"),
                new ManageLink("rx", "My templates",
                        "Your reusable treatment protocols.", "/templates", "template"),
                new ManageLink("stetho", "Doctors",
                        "Add doctors by HPR ID; set fees, rooms and branch.", "/doctors", "doctor"),
                new ManageLink("users", "Staff & roles",
                        "Front desk, nurses and admins, what each can open, and the activity log.", "/staff", "staff"),
                new ManageLink("send", "Patient messages",
                        "Every SMS sent to patients: tokens, payments, bookings and reminders.", "/messages", "message"),
                new ManageLink("pin", "Locations",
                        "Branches, rooms and which doctors work where.", "/locations", "location"),
                new ManageLink("spark", "Subscription",
                        "Your plan, trial, upgrades and payments to MedMate.", "/subscription", "subscription"),
                new ManageLink("gear", "Settings",
                        "Your PIN, the clinic profile and the prescription letterhead.", "/settings", "settings"));
    }
}
