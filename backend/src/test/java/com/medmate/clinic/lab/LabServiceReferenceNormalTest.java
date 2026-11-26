package com.medmate.clinic.lab;

import static org.assertj.core.api.Assertions.assertThat;

import com.medmate.clinic.lab.LabOrder;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Whether a result sat inside the range it was read against.
 *
 * <p>The condition used to be inverted: a result with a reference range was
 * reported as abnormal, and a result with none was reported as normal. The
 * bench showed every result as abnormal, so nobody could read it.
 */
class LabServiceReferenceNormalTest {

    @Test
    @DisplayName("a result with no value is not known to be abnormal")
    void noValueIsNotAbnormal() {
        LabOrder order = new LabOrder();
        order.setReferenceLow("12");
        assertThat(LabService.referenceNormal(order)).isTrue();
    }

    @Test
    @DisplayName("a result with no range is not known to be abnormal")
    void noRangeIsNotAbnormal() {
        LabOrder order = new LabOrder();
        order.setResultValue("48");
        assertThat(LabService.referenceNormal(order)).isTrue();
    }

    @Test
    @DisplayName("a result inside its range is normal")
    void insideTheRangeIsNormal() {
        LabOrder order = new LabOrder();
        order.setResultValue("15");
        order.setReferenceLow("12");
        order.setReferenceHigh("48");
        assertThat(LabService.referenceNormal(order)).isTrue();
    }

    @Test
    @DisplayName("a result above its range is abnormal")
    void aboveTheRangeIsAbnormal() {
        LabOrder order = new LabOrder();
        order.setResultValue("96");
        order.setReferenceLow("12");
        order.setReferenceHigh("48");
        assertThat(LabService.referenceNormal(order)).isFalse();
    }

    @Test
    @DisplayName("a result below its range is abnormal")
    void belowTheRangeIsAbnormal() {
        LabOrder order = new LabOrder();
        order.setResultValue("4");
        order.setReferenceLow("12");
        order.setReferenceHigh("48");
        assertThat(LabService.referenceNormal(order)).isFalse();
    }

    @Test
    @DisplayName("a range with one bound is honoured on that side")
    void oneBoundIsHonoured() {
        LabOrder order = new LabOrder();
        order.setResultValue("4");
        order.setReferenceLow("12");
        assertThat(LabService.referenceNormal(order)).isFalse();

        LabOrder upperOnly = new LabOrder();
        upperOnly.setResultValue("96");
        upperOnly.setReferenceHigh("48");
        assertThat(LabService.referenceNormal(upperOnly)).isFalse();
    }

    @Test
    @DisplayName("a result that is not a number is not known to be abnormal")
    void notANumberIsNotAbnormal() {
        LabOrder order = new LabOrder();
        order.setResultValue("positive");
        order.setReferenceLow("12");
        order.setReferenceHigh("48");
        assertThat(LabService.referenceNormal(order)).isTrue();
    }
}
