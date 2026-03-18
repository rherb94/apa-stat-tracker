import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APA League Tracker",
  description: "Track APA pool league stats and player rankings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100 min-h-screen`}
      >
        <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-lg font-bold text-white">
                  APA Tracker
                </Link>
                <div className="flex gap-4">
                  <Link
                    href="/players"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Players
                  </Link>
                  <Link
                    href="/teams"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Teams
                  </Link>
                  <Link
                    href="/admin"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
