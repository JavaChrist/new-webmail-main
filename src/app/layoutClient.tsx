"use client"; // ✅ Autorisé ici

import Sidebar from "@/components/Sidebar";
import clsx from "clsx";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <body
      className={clsx(
        geistSans.variable,
        geistMono.variable,
        "antialiased bg-gray-800 min-h-screen flex"
      )}
    >
      <div className="flex w-full h-screen">
        <aside className="w-64 bg-gray-200 h-full">
          <Sidebar />
        </aside>
        <main className="flex-1 p-6 text-white overflow-auto">{children}</main>
      </div>
    </body>
  );
}
