import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, TextArea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";

export type EnterpriseEnquiryDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the enquiry as it stands. */
  onEnquire: (enquiry: { clinic: string; locations: string; doctors: string; staff: string; note: string }) => void;
};

/**
 * Ask about the enterprise plan.
 *
 * A polyclinic or a hospital chain needs more than the clinic plan, so the
 * enquiry asks for the shape of the business rather than selling a price.
 */
export function EnterpriseEnquiryDialog({ open, onClose, onEnquire }: EnterpriseEnquiryDialogProps) {
  const [clinic, setClinic] = useState("");
  const [locations, setLocations] = useState("");
  const [doctors, setDoctors] = useState("");
  const [staff, setStaff] = useState("");
  const [note, setNote] = useState("");

  const ready = clinic.trim().length > 1 && Number(doctors) > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Enterprise enquiry"
      description="We will come back with a plan for the shape of the business."
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="send"
            disabled={!ready}
            onClick={() => {
              onEnquire({ clinic, locations, doctors, staff, note });
              onClose();
            }}
          >
            Send the enquiry
          </Button>
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="enq-clinic">The clinic or group</label>
        <Input
          id="enq-clinic"
          value={clinic}
          placeholder="MedMate Health Group"
          onChange={(event) => setClinic(event.target.value)}
        />
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="enq-locations">How many locations?</label>
          <Input
            id="enq-locations"
            value={locations}
            inputMode="numeric"
            placeholder="12"
            onChange={(event) => setLocations(event.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <label htmlFor="enq-doctors">How many doctors?</label>
          <Input
            id="enq-doctors"
            value={doctors}
            inputMode="numeric"
            placeholder="40"
            onChange={(event) => setDoctors(event.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="enq-staff">How many other staff?</label>
        <Input
          id="enq-staff"
          value={staff}
          inputMode="numeric"
          placeholder="120"
          onChange={(event) => setStaff(event.target.value.replace(/\D/g, ""))}
        />
      </div>

      <div className="field">
        <label htmlFor="enq-note">Anything we should know</label>
        <TextArea
          id="enq-note"
          value={note}
          placeholder="What you run, what is not working, and what you need it to do."
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="note mint" style={{ marginTop: 14 }}>
        <Icon name="check" size={18} />
        <span>No sales call is placed. Someone from the team writes back.</span>
      </div>
    </Dialog>
  );
}
