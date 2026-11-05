"use client";
import { useStore } from "@/store/store";

export function SaveBanner() {
  const { saveError } = useStore();
  if (!saveError) return null;
  return (
    <p role="alert" className="bg-clay-ink px-4 py-2 text-center text-sm font-semibold text-ivory">
      {saveError}
    </p>
  );
}
