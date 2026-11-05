import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource/dm-serif-display";
import "./globals.css";
import { StoreProvider } from "@/store/store";
import { SiteNav } from "@/components/nav";
import { SaveBanner } from "@/components/save-banner";

export const metadata: Metadata = {
  title: { default: "GameNight — One place for every game night", template: "%s · GameNight" },
  description: "Score, track and revisit every board game and card game night with one universal scorekeeper.",
};
export const viewport: Viewport = { themeColor: "#F5F0E6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="paper min-h-dvh">
        <StoreProvider>
          <SiteNav />
          <SaveBanner />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
