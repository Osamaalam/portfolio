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
  title: "Osama Alam | AI Architect & Founder - Autonomous Agents, RAG & Full-Stack AI",
  description: "Portfolio of Osama Alam, specializing in Production-Ready Autonomous AI Agents, high-precision Vector RAG Systems, End-to-End Workflow Automation, Conversational Chatbots, and AI-Powered Internal Dashboards. Founder of EMRChains.",
  keywords: [
    "Autonomous AI Agents", "Multi-Agent Workflows", "RAG Systems", "Knowledge Base QA", 
    "Workflow Automation", "Process Automation", "Conversational AI", "Custom Chatbots", 
    "AI Dashboards", "Production-Ready AI", "AI Systems ROI", "Full-Stack AI Developer"
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
