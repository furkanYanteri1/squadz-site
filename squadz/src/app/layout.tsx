import Navbar from '@/components/Navbar'
import FloatingPostButton from '@/components/FloatingPostButton'
import { UserProvider } from '@/contexts/UserContext'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Squadz - Team-Based Social Platform",
  description: "A team-based social platform where every action represents your squad",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          <Navbar />
          {children}
          <FloatingPostButton />
        </UserProvider>
      </body>
    </html>
  )
}