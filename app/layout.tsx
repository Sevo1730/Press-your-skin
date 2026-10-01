import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Press Your Luck — Stream",
  description: "Interactive stream mini-game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
