import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calc Index · Solar Calculator",
  description: "Solar sizing and financial modeling web app.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
