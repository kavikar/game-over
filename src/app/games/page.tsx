import type { Metadata } from "next";
import { LibraryView } from "@/components/library-view";
export const metadata: Metadata = { title: "Games" };
export default function Page() {
  return <LibraryView />;
}
