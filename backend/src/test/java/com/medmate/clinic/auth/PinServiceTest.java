package com.medmate.clinic.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PinServiceTest {

    private final PinService pinService = new PinService();

    @Test
    void theSamePinForTwoPeopleGivesTwoHashes() {
        String first = pinService.hash("staff-one", "2468");
        String second = pinService.hash("staff-two", "2468");

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void aPinMatchesOnlyItsOwnHash() {
        String hash = pinService.hash("staff-one", "2468");

        assertThat(pinService.matches("staff-one", hash, "2468")).isTrue();
        assertThat(pinService.matches("staff-one", hash, "1111")).isFalse();
        assertThat(pinService.matches("staff-two", hash, "2468")).isFalse();
    }
}
