import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Classroom Companion",
  description: "AI-powered Telegram classroom assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-white text-zinc-900">{children}</body>
    </html>
  );
}
