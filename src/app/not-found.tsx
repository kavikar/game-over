import Link from "next/link";
import { Button, PageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PageShell className="max-w-xl">
      <h1 className="display text-5xl text-forest">No such game.</h1>
      <p className="mt-3 text-lg">That page does not exist. Try the game library.</p>
      <Link href="/games"><Button className="mt-6">Browse games</Button></Link>
    </PageShell>
  );
}
