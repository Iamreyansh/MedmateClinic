package com.medmate.clinic.clinic;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * The clinic's own profile: its address, its registrations, its rooms.
 *
 * <p>This lives in the clinic's schema, with the rest of its data. The
 * directory — who the clinic is and where its schema is — lives in the
 * registry, because that is the one thing every clinic shares.
 */
@Entity
@Table(name = "clinic_profile")
public class ClinicProfile {

    @Id
    @Column(name = "clinic_id")
    private UUID clinicId;

    private String phone;
    private String address;
    private String city;
    private String state;
    private String pin;
    private String gstin;
    private String pan;
    private String registration;

    @Column(name = "hfr_id")
    private String hfrId;

    @Column(nullable = false)
    private int locations = 1;

    public UUID getClinicId() {
        return clinicId;
    }

    public void setClinicId(UUID clinicId) {
        this.clinicId = clinicId;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPin() {
        return pin;
    }

    public void setPin(String pin) {
        this.pin = pin;
    }

    public String getGstin() {
        return gstin;
    }

    public void setGstin(String gstin) {
        this.gstin = gstsin(gstin);
    }

    private String gstsin(String value) {
        return value;
    }

    public String getPan() {
        return pan;
    }

    public void setPan(String pan) {
        this.pan = pan;
    }

    public String getRegistration() {
        return registration;
    }

    public void setRegistration(String registration) {
        this.registration = registration;
    }

    public String getHfrId() {
        return hfrId;
    }

    public void setHfrId(String hfrId) {
        this.hfrId = hfrId;
    }

    public int getLocations() {
        return locations;
    }

    public void setLocations(int locations) {
        this.locations = locations;
    }
}
