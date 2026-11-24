import { PinLock } from "@/components/lock/PinLock";
import { signedIn } from "@/lib/fixtures/dashboard";

export default function LockPage() {
  return <PinLock user={{ name: signedIn.name, initials: signedIn.initials }} />;
}
