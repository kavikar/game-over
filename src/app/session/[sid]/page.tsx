import type { Metadata } from "next";
import { SessionPage } from "@/components/play/session-page";
export const metadata: Metadata = { title: "Game" };
export default function Page() {
  return <SessionPage />;
}
