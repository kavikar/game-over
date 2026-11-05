import type { Metadata } from "next";
import { PlayersView } from "@/components/players-view";
export const metadata: Metadata = { title: "Players" };
export default function Page() {
  return <PlayersView />;
}
