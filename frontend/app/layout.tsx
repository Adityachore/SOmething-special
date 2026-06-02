import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Complaint Analyzer",
  description: "AI-powered complaint management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          {/* BG orbs for depth */}
          <div className="bg-orb" style={{ width:600, height:600, top:-200, left:-200, background:'#065f46' }} />
          <div className="bg-orb" style={{ width:400, height:400, top:'40%', right:-150, background:'#047857' }} />
          <div className="bg-orb" style={{ width:300, height:300, bottom:-100, left:'30%', background:'#14532d' }} />
          <div style={{ position:'relative', zIndex:1, height:'100vh', overflow:'hidden' }}>{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
