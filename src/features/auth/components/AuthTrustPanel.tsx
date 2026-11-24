"use client";

import { Icon } from "@/components/ui/Icon";

const TRUST = [
  { label: "HPR · HFR · ABHA", detail: "HPR-verified doctors on ABDM" },
  { label: "FHIR R4", detail: "Signed e-prescriptions as FHIR records" },
  { label: "DPDP 2023", detail: "Patient records only with ABHA consent" },
  { label: "TPG 2020", detail: "Telemedicine Practice Guidelines built in" },
];

/** The promise on the left of the sign-in screen. */
export function AuthTrustPanel() {
  return (
    <>
      <h1>
        Consult, prescribe and sign, <em>in one place.</em>
      </h1>
      <ul className="su-trust">
        {TRUST.map((item) => (
          <li key={item.label}>
            <Icon name="shield" size={18} />
            <span>
              <b>{item.label}</b>
              <span>{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
