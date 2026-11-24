import { AppShell } from "@/components/layout/AppShell";
import { Consult } from "@/components/console/Consult";
import { clinic, location, signedInDoctor } from "@/lib/fixtures/clinic";

export default function VisitPage() {
  return (
    <AppShell
      activeHref="/queue"
      clinic={{
        initials: clinic.initials,
        name: clinic.name,
        detail: `${clinic.locations} locations · ${clinic.doctors} doctors`,
      }}
      user={{
        initials: signedInDoctor.initials,
        name: signedInDoctor.name,
        detail: `Owner · ${signedInDoctor.speciality}`,
        tone: "doctor",
      }}
      location={location}
      counts={{ "/queue": 4, "/nurse": 2, "/inbox": 6, "/desk": 1, "/billing": 3, "/schedule": 5 }}
    >
      <Consult />
    </AppShell>
  );
}
