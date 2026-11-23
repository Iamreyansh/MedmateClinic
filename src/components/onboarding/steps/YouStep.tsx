"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import type { StepProps } from "@/components/onboarding/types";

/** Step 1 — who you are. The code follows on its own screen. */
export function YouStep({ form, set, onBack, onNext, valid }: StepProps) {
  return (
    <>
      <div className="su-eyebrow">Step 1 of 5</div>
      <h2 className="su-h">
        First, <em>about you</em>
      </h2>
      <p className="su-lead">
        You&apos;ll be the clinic&apos;s owner. We send a 6-digit code to your mobile to check it&apos;s yours.
      </p>
      <div className="su-form">
        <div className="field">
          <label htmlFor="su-name">Full name</label>
          <Input
            id="su-name"
            value={form.name}
            autoComplete="name"
            onChange={(event) => set("name", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="su-mobile">Mobile</label>
          <div className="su-cc">
            <span className="cc">+91</span>
            <Input
              id="su-mobile"
              value={form.mobile}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10-digit mobile number"
              onChange={(event) => set("mobile", event.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="su-email">Email (for invoices and agreements)</label>
          <Input
            id="su-email"
            type="email"
            value={form.email}
            autoComplete="email"
            onChange={(event) => set("email", event.target.value)}
          />
        </div>
        <div className="su-note">
          <Icon name="shield" size={16} />
          <span>Your details are used only to set up and run your MedMate account (DPDP Act 2023).</span>
        </div>
      </div>
      <div className="su-foot">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button icon="send" disabled={!valid} onClick={onNext}>
          Send code
        </Button>
      </div>
      <p className="su-signin" style={{ marginTop: 14 }}>
        Already use MedMate? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}

/** The code we sent to the mobile. */
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
            maxLength={6}
            autoComplete="one-time-code"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <div className="su-note">
            <Icon name="alert" size={16} />
            <span>Test mode: any 6-digit code works.</span>
          </div>
        ) : null}
      </div>
      <div className="su-foot">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button icon="check" disabled={!valid} onClick={onNext}>
          Verify
        </Button>
      </div>
    </>
  );
}
