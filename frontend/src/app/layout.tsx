import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "JobIN — Apply Smarter. Get Hired Faster.",
  description:
    "AI-powered job application assistant. Tailor resumes in 6 seconds, autofill applications, track your pipeline, and land 3x more interviews.",
  keywords: "job application, AI resume, ATS optimizer, job tracker, cover letter generator",
  openGraph: {
    title: "JobIN — Apply Smarter. Get Hired Faster.",
    description: "The most advanced AI job-search assistant. Beat the ATS, land interviews faster.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${outfit.variable} ${inter.variable} dark`}>
        <body className="min-h-screen bg-background font-inter antialiased">
          <QueryProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "hsl(224 25% 9%)",
                  border: "1px solid hsl(217 33% 14%)",
                  color: "hsl(210 40% 98%)",
                },
              }}
            />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
