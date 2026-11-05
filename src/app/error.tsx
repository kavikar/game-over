"use client";

import { Button, PageShell } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <PageShell className="max-w-xl">
      <h1 className="display text-5xl text-forest">Something slipped.</h1>
      <p className="mt-3 text-lg">The page hit an error. Your saved games are stored on this device and were not changed.</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </PageShell>
  );
}
