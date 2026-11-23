"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader, MobileTabBar } from "@/components/layout/Mobile";
import { Button } from "@/components/ui/Button";
import { Kpi, Kpis, Note, StatTile, StatTiles, StationCard, Title } from "@/components/ui/Card";
import { Chip, Chips, Pills } from "@/components/ui/Chip";
import { Input, SearchInput } from "@/components/ui/Input";
import { Avatar, Badge, ClinicChip, Token, UserChip } from "@/components/ui/Avatar";
import { ManageRow } from "@/components/marketing/ManageRow";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { PlanCard } from "@/components/marketing/PlanCard";

export function FidelityGuide() {
  return (
    <>
      <AppShell
        activeHref="/fidelity"
        clinic={{ initials: "MC", name: "MedMate Clinic Indiranagar", detail: "2 locations · 3 doctors" }}
        user={{ initials: "AR", name: "Dr. Ananya Rao", detail: "Owner · General Medicine" }}
        location="Indiranagar"
        access={{
          levels: {
            console: "use",
            nurse: "use",
            kiosk: "use",
            desk: "use",
            billing: "use",
            lab: "use",
            tele: "use",
            appointment: "use",
            inbox: "use",
            report: "view",
            patient: "use",
            template: "use",
            doctor: "use",
            staff: "use",
            message: "use",
            location: "use",
            subscription: "use",
            settings: "use",
          },
        }}
      >
        <div className="hello">
          <div>
            <Title emphasis="MedMate Clinic Indiranagar">Good morning,</Title>
            <p>0 awaiting vitals · 0 in your queue · 0 in your inbox · 0 prescriptions to hand over</p>
          </div>
        </div>

        <Kpis>
          <Kpi value="3" label="Waiting at the desk" icon="users" detail="+1 since 9 am" />
          <Kpi value="₹1,250" label="To collect" icon="rupee" detail="2 bills" />
          <Kpi value="12" label="Seen today" icon="check" />
          <Kpi value="4" label="Follow-ups to book" icon="cal" dark />
        </Kpis>

        <StatTiles count={4}>
          <StatTile value="1" label="Need vitals" />
          <StatTile value="0" label="Urgent" hot />
          <StatTile value="1" label="Ready" />
          <StatTile value="4 min" label="Longest wait" />
        </StatTiles>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 316px)", gap: 14, margin: "18px 0" }}>
          <StationCard
            icon="kiosk"
            tone="blue"
            title="Patient Kiosk"
            description="Patients confirm their mobile, check in and get a token."
            count="4 waiting"
            tag="Step 1"
          />
          <StationCard
            icon="stetho"
            tone="green"
            title="Doctor Console"
            description="Call the next patient, run the consult and sign the prescription."
            count="4 waiting"
            tag="Step 3"
          />
          <StationCard
            icon="lab"
            tone="indigo"
            title="Lab & Diagnostics"
            description="Collect, process and report. Every report goes to the doctor who ordered it."
            count="1 urgent"
            countWarn
            tag="Diagnostics"
          />
        </div>

        <div className="mg-grid" style={{ margin: "18px 0" }}>
          <ManageRow
            icon="chart"
            title="Reports & analytics"
            description="Consultation history, medicine analytics and Excel export."
            href="#"
          />
        </div>

        <div className="lp-grid" style={{ margin: "18px 0" }}>
          <FeatureCard
            icon="rx"
            title="Prescriptions doctors trust"
            description="Suggestions from the complaints, safety checks as you type, and a clean printed or digital prescription."
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "18px 0" }}>
          <Button icon="plus">Add someone</Button>
          <Button variant="secondary">See plans</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="gold">Review &amp; sign</Button>
          <Button variant="danger">Refund</Button>
          <Button size="sm">Small</Button>
          <Button size="block">Block</Button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "18px 0" }}>
          <Chip active>Everyone</Chip>
          <Chip>Here today</Chip>
          <Chip icon="cal">Follow-up due</Chip>
          <Badge>New</Badge>
          <Badge tone="gold">Trial ends in 3 days</Badge>
          <Badge tone="blue">ABHA linked</Badge>
          <Badge tone="red">Overdue</Badge>
          <Badge tone="plain">Archived</Badge>
          <Token label="W-01" />
          <Token label="A-04" kind="M" />
          <Token label="A-05" kind="W" />
          <Avatar initials="AR" />
          <Avatar initials="PS" tone="reception" />
          <Avatar initials="MJ" tone="nurse" />
          <Avatar initials="KB" tone="admin" />
          <UserChip initials="AR" name="Dr. Ananya Rao" detail="Owner · General Medicine" />
          <ClinicChip initials="MC" name="MedMate Clinic" detail="2 locations · 3 doctors" href="#" />
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "18px 0" }}>
          <Pills
            value="b"
            onChange={() => {}}
            options={[
              { value: "a", label: "My patients" },
              { value: "b", label: "All doctors" },
              { value: "c", label: "Unassigned" },
            ]}
          />
          <Pills
            value="yes"
            onChange={() => {}}
            yesNo
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "18px 0" }}>
          <Input placeholder="Value" />
          <SearchInput placeholder="Search patients" />
          <Note tone="mint" icon="shield">
            A MedMate card never carries a resting shadow. Borders do the work.
          </Note>
          <Note tone="gold" icon="alert">
            Your free trial ends in 3 days.
          </Note>
          <Note tone="red" icon="alert">
            The code has expired. Ask for a new one.
          </Note>
          <Note tone="blue" icon="alert">
            Telemedicine Guidelines 2020: record consent before prescribing.
          </Note>
        </div>

        <Chips>
          {["Everyone", "Here today", "Follow-up due", "Owes money"].map((option) => (
            <Chip key={option}>{option}</Chip>
          ))}
        </Chips>

        <div className="pz-cards" style={{ margin: "24px 0" }}>
          <PlanCard
            name="Solo"
            tagline="For a doctor running their own clinic"
            price="₹833"
            summary="₹9,990 billed yearly · 2 months free · + 18% GST"
            action="Choose Solo"
            features={["1 doctor, 1 location, up to 3 staff", "Queue, kiosk check-in and patient token SMS"]}
          />
          <PlanCard
            name="Clinic"
            tagline="For polyclinics and growing practices"
            price="₹2,083"
            summary="₹24,990 billed yearly · 2 months free · + 18% GST"
            action="Choose Clinic"
            variant="hi"
            popular
            features={["Up to 5 doctors, 3 locations and 20 staff", "Everything in Solo"]}
          />
        </div>
      </AppShell>

      <div style={{ width: 390, margin: "0 auto 40px", position: "relative" }}>
        <MobileHeader clinicName="MedMate Clinic" detail="Indiranagar · 3 doctors" initials="AR" />
        <MobileTabBar
          items={[
            { label: "Dashboard", icon: "home", href: "#", active: true },
            { label: "Console", icon: "stetho", href: "#" },
            { label: "Inbox", icon: "inbox", href: "#", count: 6 },
            { label: "Patients", icon: "folder", href: "#" },
            { label: "More", icon: "more" },
          ]}
        />
      </div>
    </>
  );
}
