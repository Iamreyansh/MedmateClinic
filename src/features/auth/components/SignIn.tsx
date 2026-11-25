"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { codeCleared, requestCode, verifyCode } from "@/features/auth/state/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function SignIn() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, testCode, error } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (status === "signed-in") navigate("/dashboard");
  }, [status, navigate]);

  const sendCode = async () => {
    // the screen moves to the code only when the code was actually sent
    const result = await dispatch(requestCode(phone));
    if (requestCode.fulfilled.match(result)) {
      setStep("code");
    }
  };

  const verify = async () => {
    await dispatch(verifyCode({ phone, code: code.join("") }));
  };

  const startOver = () => {
    dispatch(codeCleared());
    setCode(Array(6).fill(""));
    setStep("phone");
  };

  const typeDigit = (index: number, value: string) => {
    const next = [...code];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setCode(next);
    if (value && index < 5) boxes.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !code[index] && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) boxes.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5) boxes.current[index + 1]?.focus();
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setCode(Array.from({ length: 6 }, (_, i) => pasted[i] ?? ""));
    boxes.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <>
      <h2 className="su-h">
        Welcome to <em>MedMate</em>
      </h2>
      <p className="su-lead">Doctors and clinic staff sign in with their registered mobile.</p>

      {step === "phone" ? (
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
          </div>
          {error ? <span className="err">{error}</span> : null}
          <Button
            icon="send"
            className="block"
            disabled={phone.length !== 10 || status === "sending"}
            onClick={() => void sendCode()}
          >
            Send code
          </Button>
          <div className="su-note neutral">
            <Icon name="lock" size={16} />
            <span>Only staff added by the clinic can sign in. Every sign-in is logged.</span>
          </div>
        </div>
      ) : (
        <div className="su-form">
          <p className="su-lead">Enter the 6-digit code sent to +91 {phone}</p>
          <div className="otp">
            {code.map((digit, index) => (
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
          {testCode ? (
            <div className="su-note neutral">
              <Icon name="alert" size={16} />
              <span>Test mode: the code is {testCode}.</span>
            </div>
          ) : null}
          {error ? <span className="err">{error}</span> : null}
          <Button
            icon="check"
            className="block"
            disabled={code.join("").length !== 6 || status === "verifying"}
            onClick={() => void verify()}
          >
            Verify and sign in
          </Button>
          <button type="button" className="su-link plain" onClick={startOver}>
            Use a different number
          </button>
          <div className="su-note neutral">
            <Icon name="lock" size={16} />
            <span>Only staff added by the clinic can sign in. Every sign-in is logged.</span>
          </div>
        </div>
      )}

      <p className="su-signin" style={{ marginTop: 18 }}>
        New clinic? <Link to="/start">Set up your clinic on MedMate</Link>
      </p>
    </>
  );
}
