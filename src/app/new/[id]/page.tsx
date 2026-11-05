import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "@/games";
import { getGame, listGames } from "@/engine/registry";
import { SetupForm } from "@/components/setup-form";

export function generateStaticParams() {
  return listGames().map((g) => ({ id: g.meta.id }));
}
export const metadata: Metadata = { title: "New session" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getGame(id)) notFound();
  return <SetupForm gameId={id} />;
}
