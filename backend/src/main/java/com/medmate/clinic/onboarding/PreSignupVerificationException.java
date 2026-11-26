package com.medmate.clinic.onboarding;

/**
 * The number behind a sign-up has not been proved.
 *
 * <p>A clinic may only be created by someone who has proved they hold the
 * number that will be the owner's. The sign-up says so in the same envelope
 * every other form failure uses.
 */
public class PreSignupVerificationException extends RuntimeException {

    public PreSignupVerificationException(String message) {
        super(message);
    }
}
