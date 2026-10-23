import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "REGENT — A Higher Standard for Your Time",
  description: "Plan with intent. Execute with discipline. Build a life you are proud of. REGENT is a premium personal command center for daily planning, habits, fitness, studying, focus sessions, projects, goals, and historical progress.",
  keywords: ["productivity", "habits", "focus", "planning", "goals", "study", "projects"],
  openGraph: {
    title: "REGENT — A Higher Standard for Your Time",
    description: "Bring your days, habits, goals, and projects into one carefully designed workspace.",
    type: "website",
  },
  icons: {
    icon: "/regent-icon.svg",
    apple: "/regent-icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
