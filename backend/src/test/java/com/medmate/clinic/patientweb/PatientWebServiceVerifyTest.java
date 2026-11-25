package com.medmate.clinic.patientweb;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The prescription's hash.
 *
 * <p>The check used to be missing: the endpoint ignored the hash it was given
 * and answered {@code genuine: true} for everything, so a guessed prescription
 * id disclosed the patient's name, age, diagnoses and medicines.
 */
class PatientWebServiceVerifyTest {

    @Test
    @DisplayName("the hash that was handed out verifies")
    void theRightHashVerifies() {
        assertThat(PatientWebService.genuine("the-token", "the-token")).isTrue();
    }

    @Test
    @DisplayName("a wrong hash does not verify")
    void aWrongHashDoesNot() {
        assertThat(PatientWebService.genuine("the-token", "another-token")).isFalse();
        assertThat(PatientWebService.genuine("the-token", "the-toke")).isFalse();
        assertThat(PatientWebService.genuine("the-token", "the-token ")).isFalse();
    }

    @Test
    @DisplayName("no hash does not verify")
    void noHashDoesNot() {
        assertThat(PatientWebService.genuine("the-token", "")).isFalse();
        assertThat(PatientWebService.genuine("the-token", null)).isFalse();
    }

    @Test
    @DisplayName("a prescription that holds no token never verifies")
    void noStoredTokenNeverVerifies() {
        assertThat(PatientWebService.genuine(null, "anything")).isFalse();
        assertThat(PatientWebService.genuine("", "anything")).isFalse();
        assertThat(PatientWebService.genuine(null, null)).isFalse();
    }
}
