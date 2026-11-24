"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AGREEMENTS } from "@/features/onboarding/types";

/** Step 5 — the three agreements, each agreed to on its own. */
export function AgreementsStep({
  agreed,
  onToggle,
  onBack,
  onFinish,
  valid,
}: {
  agreed: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onFinish: () => void;
  valid: boolean;
}) {
  return (
    <>
      <div className="su-eyebrow">Step 5 of 5</div>
      <h2 className="su-h">
        Read and <em>agree</em>
      </h2>
      <p className="su-lead">Short and in plain words. Read each one; the key points are on top.</p>
      <div className="su-form">
        {AGREEMENTS.map((agreement) => {
          const isOn = agreed.includes(agreement.id);
          return (
            <div key={agreement.id} className={`su-agr${isOn ? " on" : ""}`}>
              <div className="su-agr-head">
                <button
                  type="button"
                  className="tick"
                  aria-pressed={isOn}
                  aria-label={`Agree to the ${agreement.title}`}
                  onClick={() => onToggle(agreement.id)}
                >
                  {isOn ? <Icon name="check" size={14} /> : null}
                </button>
                <b>{agreement.title}</b>
                <span className="v">{agreement.version}</span>
                <a href={agreement.href} target="_blank" rel="noreferrer">
                  Open in a new tab
                </a>
              </div>
              <p>{agreement.points}</p>
            </div>
          );
        })}
        <div className="su-note">
          <Icon name="lock" size={16} />
          <span>
            We record who agreed, the version, the time and the device. Agreements can&apos;t be changed
            afterwards.
          </span>
        </div>
      </div>
      <div className="su-foot">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button icon="check" disabled={!valid} onClick={onFinish}>
          Set up your clinic
        </Button>
      </div>
      <p className="su-fine">Free to try. Nothing is charged during set-up.</p>
    </>
  );
}
