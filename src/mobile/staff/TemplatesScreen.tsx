"use client";

import { useCallback, useState } from "react";
import { fetchTemplates } from "@/mobile/api";
import { StaffShell } from "@/mobile/appShell";
import { useRemote } from "@/mobile/hooks";
import {
  MobileCard,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileTitle,
} from "@/mobile/components";

/**
 * The doctor's saved templates on a phone.
 *
 * A template is a prescription the doctor has written before: the
 * medicines in it, and how many times it has been used.
 */
export function MobileTemplatesScreen() {
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => fetchTemplates(), []);
  const { status, data, error, reload, unreachable } = useRemote(load);

  const template = data?.items.find((entry) => entry.id === open) ?? null;

  return (
    <StaffShell activeHref="/m/templates">
      <MobileTitle title="My templates" line={data?.meta ?? "The prescriptions you reuse"} />

      {status === "loading" && !data ? <MobileLoading /> : null}
      {status === "error" && error ? (
        <MobileError message={error} onRetry={reload} unreachable={unreachable} />
      ) : null}

      {status === "ready" && data && data.items.length === 0 ? (
        <MobileEmpty
          title="No templates yet"
          copy="Save a prescription you write often, and it will be here."
        />
      ) : null}

      {template ? (
        <>
          <button type="button" className="btn ghost sm" onClick={() => setOpen(null)}>
            Back to the templates
          </button>
          <MobileCard title={template.name}>
            <p className="t-cap" style={{ marginBottom: 10 }}>
              {template.condition}
              {template.code ? ` · ${template.code}` : ""}
            </p>
            <div className="mob-section">
              {template.lines.map((line) => (
                <div key={line} className="mob-row">
                  <span className="txt">
                    <b style={{ whiteSpace: "normal" }}>{line}</b>
                  </span>
                </div>
              ))}
            </div>
            <p className="t-cap" style={{ marginTop: 10 }}>
              Used {template.used} {template.used === 1 ? "time" : "times"}.
            </p>
          </MobileCard>
        </>
      ) : null}

      {data && data.items.length > 0 && !template ? (
        <MobileCard>
          <div className="mob-section">
            {data.items.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="mob-row"
                onClick={() => setOpen(entry.id)}
              >
                <span className="ico">
                  <span style={{ fontWeight: 800, fontSize: 12 }}>Rx</span>
                </span>
                <span className="txt" style={{ whiteSpace: "normal" }}>
                  <b style={{ whiteSpace: "normal" }}>{entry.name}</b>
                  <small style={{ whiteSpace: "normal" }}>{entry.condition}</small>
                </span>
                <span className="end">
                  <span className="badge plain">{entry.lines.length} lines</span>
                  <span className="badge mint">Used {entry.used}</span>
                </span>
              </button>
            ))}
          </div>
        </MobileCard>
      ) : null}
    </StaffShell>
  );
}
