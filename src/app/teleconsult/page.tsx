import { AppShell } from "@/components/layout/AppShell";
import { TeleconsultScreen } from "@/components/teleconsult/TeleconsultScreen";
import { clinic, location, signedInDoctor } from "@/lib/fixtures/clinic";

export default function Page() {
  return (
    <AppShell
      activeHref="/teleconsult"
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
      <TeleconsultScreen />
    </AppShell>
  );
}
