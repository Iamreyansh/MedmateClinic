"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/services/api";
import { requestPreSignupCode, verifyPreSignupCode } from "@/features/onboarding/api/signup";
import { MAX_CODE_ATTEMPTS, RESEND_COOLDOWN_SECONDS } from "@/features/onboarding/types";

/** The message a person may see for a failure. */
function messageFor(reason: unknown, fallback: string): string {
  if (reason instanceof ApiError && reason.message) return reason.message;
  return fallback;
}

/**
 * The code the owner checks before the clinic is created.
 *
 * The service holds the number until the clinic exists, so the number can be
 * checked before there is a clinic to check it against. The service's rules
 * hold here as they do everywhere else: a code is spent after a few tries, a
 * number waits before it may ask for another one, and a number that has been
 * checked has no wait left on it.
 */
export function CodeStep({
  mobile,
  code,
  setCode,
  onBack,
  onNext,
  valid,
}: {
  mobile: string;
  code: string;
  setCode: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  valid: boolean;
}) {
  const [checking, setChecking] = useState(false);
  const [tries, setTries] = useState(0);
  const [spent, setSpent] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [testCode, setTestCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const askForCode = useCallback(async () => {
    const sent = await requestPreSignupCode(mobile);
    return sent.code ?? null;
  }, [mobile]);

  /** The code could not be sent, so the number may ask again at once. */
  const failed = useCallback((reason: unknown) => {
    setTestCode(null);
    setCooldown(0);
    setError(messageFor(reason, "The code could not be sent. Try again in a moment."));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const first = async () => {
      try {
        const code = await askForCode();
        if (!cancelled) setTestCode(code);
      } catch (reason) {
        if (!cancelled) failed(reason);
      }
    };
    void first();
    return () => {
      cancelled = true;
    };
  }, [askForCode, failed]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  /** Ask for another code. The number waits before it may ask again. */
  const resend = async () => {
    setError(null);
    setSpent(false);
    setTries(0);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    try {
      setTestCode(await askForCode());
    } catch (reason) {
      failed(reason);
    }
  };

  const verify = async () => {
    setChecking(true);
    setError(null);
    try {
      await verifyPreSignupCode(mobile, code);
      // a number that has been checked waits for nothing
      setCooldown(0);
      onNext();
    } catch (reason) {
      const attempts = tries + 1;
      setTries(attempts);
      if (attempts >= MAX_CODE_ATTEMPTS) setSpent(true);
      setError(messageFor(reason, "That code is not right. Ask for a new one."));
    } finally {
      setChecking(false);
    }
  };

  const left = Math.max(0, MAX_CODE_ATTEMPTS - tries);

  return (
    <>
      <div className="su-eyebrow">Step 1 of 5</div>
      <h2 className="su-h">
        Enter the <em>code</em>
      </h2>
      <p className="su-lead">We sent a 6-digit code to {mobile ? `+91 ${mobile}` : "your mobile"}.</p>
      <div className="su-form">
        <div className="field">
          <label htmlFor="su-code">6-digit code</label>
          <Input
            id="su-code"
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            disabled={spent}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
        {testCode ? (
          <div className="su-note">
            <Icon name="alert" size={16} />
            <span>Test mode: the code is {testCode}.</span>
          </div>
        ) : null}
        {error ? <span className="err">{error}</span> : null}
        {spent ? (
          <div className="su-note neutral">
            <Icon name="lock" size={16} />
            <span>That code is spent. Ask for a new one and try again.</span>
          </div>
        ) : null}
      </div>
      <div className="su-foot">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button icon="check" disabled={!valid || checking || spent} onClick={verify}>
          {checking ? "Checking…" : "Verify"}
        </Button>
      </div>
      <p className="su-fine">
        <button type="button" className="su-link plain" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Send another code in ${cooldown}s` : "Send a new code"}
        </button>
        {" · "}
        {left === 1 ? "1 try left" : `${left} tries left`}
      </p>
    </>
  );
}
