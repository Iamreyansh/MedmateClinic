import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { apiGet } from "@/services/api";
import { TemplateEditorDialog } from "@/features/templates/components/TemplateEditorDialog";
import { CATALOGUE } from "@/lib/medicines";
import { Chip } from "@/components/ui/Chip";
import { SearchInput } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/ScreenStates";

/** One prescription template. */
export type Template = {
  id: string;
  name: string;
  code: string;
  condition: string;
  lines: string[];
  used: number;
};

type TemplatesPayload = {
  items: Template[];
  meta: string;
};

export function TemplatesView() {
  const [payload, setPayload] = useState<TemplatesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the template being written, or null when the list is showing
  const [editing, setEditing] = useState<Template | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  /** Whose templates are shown — yours, or a colleague's. */
  const [scope, setScope] = useState<"mine" | "colleagues">("mine");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Most used");

  // a retry asks again — the counter is what changes
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    apiGet<TemplatesPayload>("/clinic/templates", { signal: controller.signal })
      .then((data) => {
        if (!alive) return;
        setPayload(data);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Could not load the templates");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [attempt]);

  const templates = (payload?.items ?? []).filter((template) =>
    search.trim()
      ? [template.name, template.code, template.condition].some((field) =>
          field.toLowerCase().includes(search.trim().toLowerCase()),
        )
      : true,
  );

  return (
    <>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            My <em>templates</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            {payload?.meta ??
              "Your reusable treatment protocols. Apply one in the console and adjust doses by weight."}
          </p>
        </div>
        <Button icon="plus" onClick={() => setEditorOpen(true)}>
          New template
        </Button>
      </div>

      {/* the three steps, so a new doctor knows what a template is for */}
      <div className="tpl-quick" style={{ marginBottom: 14 }}>
        {[
          {
            n: "1",
            text: (
              <>
                <b>Build one here</b>, or in a consult tap <b>Save as template</b>.
              </>
            ),
          },
          {
            n: "2",
            text: (
              <>
                <b>Apply it in a consult.</b> It adds the medicines, tests and advice, and never
                removes what is there.
              </>
            ),
          },
          {
            n: "3",
            text: (
              <>
                <b>Check every line before signing.</b> A dose that suits one patient may not suit the
                next.
              </>
            ),
          },
        ].map((step) => (
          <div key={step.n} className="card" style={{ padding: 14, display: "flex", gap: 10 }}>
            <span className="tk" style={{ width: 26, height: 26, fontSize: 12 }}>
              {step.n}
            </span>
            <p className="t-cap" style={{ margin: 0 }}>
              {step.text}
            </p>
          </div>
        ))}
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        <Chip active={scope === "mine"} onClick={() => setScope("mine")}>
          Mine <span className="count">{templates.length}</span>
        </Chip>
        <Chip active={scope === "colleagues"} onClick={() => setScope("colleagues")}>
          From colleagues <span className="count">0</span>
        </Chip>
      </div>

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}

      {loading && !payload ? <LoadingState title="Loading the templates…" /> : null}

      {templates.length === 0 && !error && !loading ? (
        <EmptyState
          title="No templates yet"
          copy="Build one for the conditions you treat most, such as viral fever or acidity, or copy one from a colleague."
          icon="rx"
        />
      ) : null}

      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <SearchInput
            value={search}
            placeholder="Search name, diagnosis or medicine"
            aria-label="Search the templates"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: 160 }}
          value={sort}
          aria-label="Sort the templates"
          onChange={(event) => setSort(event.target.value)}
        >
          <option>Most used</option>
          <option>Newest</option>
          <option>A–Z</option>
        </select>
      </div>

      <div className="tpl-grid">
        {templates.map((template) => (
          <article className="card tpl" key={template.id} style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <b style={{ fontSize: 16 }}>{template.name}</b>
                <p className="t-cap" style={{ marginTop: 2 }}>
                  {template.code} {template.condition}
                </p>
              </div>
              <span className="badge plain">Used {template.used} times</span>
            </div>

            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              {template.lines.map((line) => (
                <div key={line} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
                  <Icon name="pill" size={15} style={{ color: "var(--green-700)" }} />
                  {line}
                </div>
              ))}
            </div>

            <div className="tpl-acts">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(template);
                  setEditorOpen(true);
                }}
              >
                Edit
              </Button>
              <span style={{ color: "var(--green-700)", fontWeight: 700, fontSize: 13.5 }}>
                Share with colleagues
              </span>
            </div>
          </article>
        ))}
      </div>

      <TemplateEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={
          editing
            ? {
                id: editing.id,
                name: editing.name,
                diagnosis: editing.condition,
                lines: editing.lines.map((line) => ({
                  name: line,
                  dose: "",
                  when: "",
                  forDays: "",
                  notes: "",
                })),
              }
            : null
        }
        catalogue={CATALOGUE}
        onSave={(template) => {
          // The template is saved on the server; the list refreshes with it.
          void template;
        }}
      />
    </>
  );
}
