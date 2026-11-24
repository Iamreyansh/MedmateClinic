"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The lock screen.
 *
 * A desktop screen, so there is no keypad: the PIN is typed. The four dots are
 * four one-digit fields that advance on their own, so a paste of the whole PIN
 * fills them all.
 */

const PIN_LENGTH = 4;

export type LockedUser = {
  name: string;
  initials: string;
};

export function PinLock({ user }: { user: LockedUser }) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(""));
  const [error, setError] = useState("");
  const fields = useRef<Array<HTMLInputElement | null>>([]);

  const unlock = (value: string) => {
    setError("");
    // The PIN is checked by the API; until it is connected the screen opens.
    if (value.length < PIN_LENGTH) return;
    router.push("/dashboard");
  };

  const type = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value.replace(/\D/g, "").slice(-1);
    setDigits(next);
    setError("");

    const joined = next.join("");
    if (value && index < PIN_LENGTH - 1) {
      fields.current[index + 1]?.focus();
    }
    if (joined.length === PIN_LENGTH) unlock(joined);
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) fields.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) fields.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < PIN_LENGTH - 1) fields.current[index + 1]?.focus();
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array.from({ length: PIN_LENGTH }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    unlock(next.join(""));
  };

  return (
    <div className="pin-lock">
      <div className="pin-lock-in">
        <div className="lockup" style={{ justifyContent: "center" }}>
          <div className="wordmark">
            Med<span className="m">Mate</span>
          </div>
        </div>

        <div className="pin-avatar">{user.initials}</div>
        <h1>{user.name}</h1>
        <p className="why">Locked to keep patient details private.</p>

        <p className="label">Your {PIN_LENGTH}-digit PIN</p>
        <div className="pin-dots">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                fields.current[index] = element;
              }}
              className={digit ? "filled" : ""}
              value={digit}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              autoFocus={index === 0}
              aria-label={`Digit ${index + 1} of ${PIN_LENGTH}`}
              onChange={(event) => type(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={onPaste}
            />
          ))}
        </div>
        {error ? <span className="err">{error}</span> : null}

        <button type="button" className="pin-switch" onClick={() => router.push("/login")}>
          Switch user
        </button>
      </div>
    </div>
  );
}
