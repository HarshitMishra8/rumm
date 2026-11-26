import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { WishlistProvider } from "@/components/WishlistProvider";
import { ChatWidget } from "@/components/ChatWidget";
import { geminiEnabled } from "@/lib/gemini";
import { currentUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { Footer } from "@/components/Footer";
import "./globals.css";

const sans = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Rumm: furniture for the rooms you live in", template: "%s | Rumm" },
  description: "Flat-pack furniture and home things, delivered across India in three working days.",
};

export const viewport: Viewport = { themeColor: "#E8ECEB" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en-IN" className={sans.variable}>
      <body>
        <CartProvider>
          <WishlistProvider signedIn={!!user}>
            <Suspense fallback={<div className="site-header" />}>
              <Header userName={user?.name ?? null} isAdmin={isAdmin(user)} />
            </Suspense>
            <main id="main">{children}</main>
            <Footer />
            {geminiEnabled() && <ChatWidget />}
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
