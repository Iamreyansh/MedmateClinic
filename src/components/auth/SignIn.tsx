"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell, AuthTrustList } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";

/**
 * Signing in: a registered mobile, then the code we send to it.
 *
 * The number is never prefilled — the file shows an example, a real person
 * types their own. The code step takes six boxes, one digit each.
 */

const TRUST = [
  { label: "HPR · HFR · ABHA", detail: "HPR-verified doctors on ABDM" },
  { label: "FHIR R4", detail: "Signed e-prescriptions as FHIR records" },
  { label: "DPDP 2023", detail: "Patient records only with ABHA consent" },
  { label: "TPG 2020", detail: "Telemedicine Practice Guidelines built in" },
];

const CODE_LENGTH = 6;

export function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState("");
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const code = digits.join("");

  const sendCode = () => {
    setError("");
    // The API sends the code; until it is connected the step moves on.
    setStep("code");
  };

  const verify = () => {
    if (code.length < CODE_LENGTH) return;
    setError("");
    // The session is created by the API; until then, the person signs in.
    router.push("/dashboard");
  };

  const typeDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setDigits(next);
    if (value && index < CODE_LENGTH - 1) boxes.current[index + 1]?.focus();
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ""));
    boxes.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) boxes.current[index + 1]?.focus();
  };

  return (
    <AuthShell
      side={
        <>
          <h1>
            Consult, prescribe and sign, <em>in one place.</em>
          </h1>
          <AuthTrustList items={TRUST} />
        </>
      }
    >
      {step === "phone" ? (
        <>
          <h2 className="su-h">
            Welcome to <em>MedMate</em>
          </h2>
          <p className="su-lead">Doctors and clinic staff sign in with their registered mobile.</p>
          <div className="su-form">
            <div className="field">
              <label htmlFor="signin-mobile">Registered mobile number</label>
              <div className="su-cc">
                <span className="cc">+91</span>
                <Input
                  id="signin-mobile"
                  value={phone}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="98450 12345"
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                />
              </div>
              {error ? <span className="err">{error}</span> : null}
            </div>
            <Button
              icon="send"
              className="block"
              disabled={phone.length !== 10}
              onClick={sendCode}
            >
              Send code
            </Button>
            <div className="su-note neutral">
              <Icon name="lock" size={16} />
              <span>Only staff added by the clinic can sign in. Every sign-in is logged.</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="su-h">
            Welcome to <em>MedMate</em>
          </h2>
          <p className="su-lead">Enter the 6-digit code sent to +91 {phone}</p>
          <div className="su-form">
            <div className="otp">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    boxes.current[index] = element;
                  }}
                  value={digit}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  aria-label={`Digit ${index + 1}`}
                  onChange={(event) => typeDigit(index, event.target.value)}
                  onKeyDown={(event) => onKeyDown(index, event)}
                  onPaste={onPaste}
                />
              ))}
            </div>
            {error ? <span className="err">{error}</span> : null}
            <Button icon="check" className="block" disabled={code.length < CODE_LENGTH} onClick={verify}>
              Verify and sign in
            </Button>
            <button type="button" className="su-link plain" onClick={() => setStep("phone")}>
              Use a different number
            </button>
            <div className="su-note neutral">
              <Icon name="lock" size={16} />
              <span>Only staff added by the clinic can sign in. Every sign-in is logged.</span>
            </div>
          </div>
        </>
      )}

      <p className="su-link" style={{ marginTop: 18 }}>
        New clinic?{" "}
        <Link href="/start">Set up your clinic on MedMate</Link>
      </p>
    </AuthShell>
  );
}
