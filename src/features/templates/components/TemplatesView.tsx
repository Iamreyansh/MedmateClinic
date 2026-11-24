import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { templates } from "@/services/api/mock/clinic";

export function TemplatesView() {
  return (
    <>
      <div className="nq-bar">
        <div>
          <h1 className="t-h1">
            My <em>templates</em>
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>
            Your reusable treatment protocols. Apply one in the console and adjust doses by weight.
          </p>
        </div>
        <Button icon="plus">New template</Button>
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
              <Button variant="secondary">Edit</Button>
              <span style={{ color: "var(--green-700)", fontWeight: 700, fontSize: 13.5 }}>Share with colleagues</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
