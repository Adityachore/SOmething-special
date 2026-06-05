import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "AI Complaint Analyzer",
  description: "AI-powered complaint management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          {/* BG orbs for depth */}
          <div className="bg-orb" style={{ width:600, height:600, top:-200, left:-200, background:'#78350f' }} />
          <div className="bg-orb" style={{ width:400, height:400, top:'40%', right:-150, background:'#451a03' }} />
          <div className="bg-orb" style={{ width:300, height:300, bottom:-100, left:'30%', background:'#3b2314' }} />
          <div style={{ position:'relative', zIndex:1, height:'100vh', overflow:'hidden' }}>{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
