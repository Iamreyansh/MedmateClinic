import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, Kpi, Kpis, Title } from "@/components/ui/Card";
import { Note } from "@/components/ui/Card";

const next = [
  ["Nurse station", "/nurse", "Vitals, priority, routing to a doctor"],
  ["Doctor console", "/queue", "The queue, the call-in, the seven-step consult"],
  ["Reception desk", "/desk", "The signed prescription to hand over, the checkout checklist"],
  ["Billing & POS", "/billing", "Bills, UPI/cash/card, refunds, the day close"],
];

export default function HomePage() {
  return (
    <AppShell
      activeHref="/"
      clinic={{ initials: "MC", name: "MedMate Clinic Indiranagar", detail: "1 doctor" }}
      user={{ initials: "NK", name: "Dr. Naveen Kulkarni", detail: "Owner · Psychiatry" }}
    >
      <div className="hello">
        <div>
          <Title emphasis="MedMate Doctor">MedMate</Title>
          <p>The clinic dashboard, rebuilt on the product&apos;s own stylesheet and icon set.</p>
        </div>
      </div>

      <Kpis>
        <Kpi value="19" label="Screens in the Figma file" icon="check" />
        <Kpi value="1,074" label="Classes in the stylesheet" icon="chart" />
        <Kpi value="38" label="Icons, byte-exact" icon="spark" />
        <Kpi value="0" label="Tokens redefined" icon="shield" dark />
      </Kpis>

      <Note tone="mint" icon="shield">
        The shell, the design system and the fidelity harness are in place. Screens are added one at a
        time against the Figma file — pick the first one and it gets built to the pixel.
      </Note>

      <section className="sg">
        <div className="sg-head">
          <div>
            <div className="t-h3">Ready to build</div>
            <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 12.5 }}>
              Each screen brings its own endpoint. The order below is the order the work lands in.
            </p>
          </div>
        </div>
        <ul className="sg-list">
          {next.map(([name, href, detail]) => (
            <li key={href}>
              <span className="sg-dot" />
              <div>
                <b>{name}</b>
                <p>{detail}</p>
              </div>
              <Link href="/fidelity">
                <Button size="sm" variant="secondary">
                  Preview the kit
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Card style={{ padding: 18, borderRadius: 18, marginTop: 18 }}>
        <div className="t-h3">Where the truth lives</div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6, maxWidth: 620 }}>
          <code>src/styles/medmate.css</code> is the deployed product stylesheet, byte-for-byte.{" "}
          <code>src/assets/icons.json</code> is the 38-icon set. Both are measured from the live MVP; the
          Figma file is the design of record and the two are checked against each other.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <Link href="/fidelity">
            <Button>Open the style guide</Button>
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
