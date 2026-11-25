import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { CatalogueMedicine } from "@/lib/medicines";

export type TemplateLine = {
  name: string;
  dose: string;
  when: string;
  forDays: string;
  notes: string;
};

export type TemplateEditorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** The template being edited, or null when a new one is being written. */
  template: { id: string; name: string; diagnosis: string; lines: TemplateLine[] } | null;
  /** Called with the template as it stands. */
  onSave: (template: { name: string; diagnosis: string; lines: TemplateLine[] }) => void;
  /** The medicines the doctor can pick from. */
  catalogue: CatalogueMedicine[];
};

/**
 * The template editor.
 *
 * A template is a prescription the doctor keeps: the name, the diagnosis it
 * is for, and the medicines. A template only adds — it never removes a line
 * from the prescription it is applied to.
 */
export function TemplateEditorDialog({
  open,
  onClose,
  template,
  onSave,
  catalogue,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState(template?.name ?? "");
  const [diagnosis, setDiagnosis] = useState(template?.diagnosis ?? "");
  const [lines, setLines] = useState<TemplateLine[]>(template?.lines ?? []);

  const ready = name.trim().length > 1 && lines.length > 0;

  const move = (index: number, by: number) => {
    const next = [...lines];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLines(next);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={template ? "Edit the template" : "New template"}
      description="A template adds to a prescription. It never takes a line away."
      size="wide"
      variant="tp-editor"
      closeLabel="Close"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="check"
            disabled={!ready}
            onClick={() => {
              onSave({ name, diagnosis, lines });
              onClose();
            }}
          >
            Save the template
          </Button>
        </>
      }
    >
      <div className="tp-sec">
        <h3>
          <span>1</span>
          What the template is for
        </h3>
        <div className="grid2">
          <div className="field">
            <label htmlFor="tpl-name">Name</label>
            <Input
              id="tpl-name"
              value={name}
              placeholder="Viral fever — child"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="tpl-diagnosis">For this diagnosis</label>
            <Input
              id="tpl-diagnosis"
              value={diagnosis}
              placeholder="Acute viral pharyngitis"
              onChange={(event) => setDiagnosis(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="tp-sec">
        <h3>
          <span>2</span>
          The medicines
          <small>{lines.length} line{lines.length === 1 ? "" : "s"}</small>
        </h3>

        <ul className="tp-meds">
          {lines.map((line, index) => (
            <li key={`${line.name}-${index}`}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{line.name}</b>
                  <span>
                    {line.dose} · {line.when} · {line.forDays}
                  </span>
                </div>
                <div className="tp-move">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <Icon name="up" size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === lines.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <Icon name="up" size={12} style={{ transform: "rotate(180deg)" }} />
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLines(lines.filter((_, position) => position !== index))}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="tp-search" style={{ marginTop: 12 }}>
          <Input placeholder="Add a medicine — brand or generic" aria-label="Add a medicine to the template" />
        </div>

        <div className="chips" style={{ marginTop: 8 }}>
          {catalogue.slice(0, 6).map((medicine) => (
            <button
              key={medicine.brand}
              type="button"
              className={cn("chip")}
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    name: `${medicine.brand} ${medicine.dose}`,
                    dose: medicine.dose,
                    when: "Once a day (1-0-0)",
                    forDays: "3 days",
                    notes: medicine.usedFor,
                  },
                ])
              }
            >
              + {medicine.brand}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
