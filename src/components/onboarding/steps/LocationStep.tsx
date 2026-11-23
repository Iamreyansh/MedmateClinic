"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { STATES, type StepProps } from "@/components/onboarding/types";

/** Step 3 — where the clinic sees patients. */
export function LocationStep({ form, set, onBack, onNext, valid }: StepProps) {
  return (
    <>
      <div className="su-eyebrow">Step 3 of 5</div>
      <h2 className="su-h">
        Where do you <em>see patients?</em>
      </h2>
      <p className="su-lead">Your first location. Add more branches later from Locations.</p>
      <div className="su-form">
        <div className="field">
          <label htmlFor="su-loc-name">Name for this location</label>
          <Input
            id="su-loc-name"
            value={form.locName}
            onChange={(event) => set("locName", event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="su-street">Building and street</label>
          <Input
            id="su-street"
            value={form.street}
            onChange={(event) => set("street", event.target.value)}
          />
        </div>
        <div className="su-2">
          <div className="field">
            <label htmlFor="su-area">Area or landmark</label>
            <Input
              id="su-area"
              value={form.area}
              onChange={(event) => set("area", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="su-city">City or town</label>
            <Input id="su-city" value={form.city} onChange={(event) => set("city", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="su-pin">PIN code</label>
            <Input
              id="su-pin"
              value={form.pin}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => set("pin", event.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="field">
            <label htmlFor="su-state">State</label>
            <select
              id="su-state"
              className="input"
              value={form.state}
              onChange={(event) => set("state", event.target.value)}
            >
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="su-phone">Phone patients can call</label>
            <Input
              id="su-phone"
              value={form.phone}
              inputMode="tel"
              onChange={(event) => set("phone", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="su-rooms">Consultation rooms</label>
            <Input
              id="su-rooms"
              value={form.rooms}
              placeholder="Room 1, Room 2"
              onChange={(event) => set("rooms", event.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="su-hfr">HFR facility ID (optional)</label>
          <Input id="su-hfr" value={form.hfr} onChange={(event) => set("hfr", event.target.value)} />
        </div>
      </div>
      <div className="su-foot">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!valid} onClick={onNext}>
          Continue
        </Button>
      </div>
    </>
  );
}
