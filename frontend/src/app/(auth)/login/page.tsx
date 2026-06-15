import { SignIn } from "@clerk/nextjs";
import { Zap, CheckCircle } from "lucide-react";

export const metadata = {
  title: "Sign In — JobIN",
  description: "Sign in to your JobIN account and continue your AI-powered job search.",
};

const features = [
  "AI resume tailoring in under 10 seconds",
  "ATS score analysis with keyword gaps",
  "Automated job application tracking",
  "Chrome extension for 1-click autofill",
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel */}
      <div className="relative hidden lg:flex w-1/2 flex-col justify-between p-12 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent" />
        <div className="absolute top-1/4 -left-24 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-64 w-64 rounded-full bg-indigo-600/8 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-outfit text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            JobIN
          </span>
        </div>

        {/* Main copy */}
        <div className="relative space-y-6">
          <div>
            <h1 className="font-outfit text-4xl font-bold leading-tight">
              Apply Smarter.{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Get Hired Faster.
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              The AI-powered job assistant trusted by thousands of candidates to land more interviews and secure better offers.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                {f}
              </li>
            ))}
          </ul>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { value: "94%", label: "ATS pass rate" },
              { value: "3×", label: "More interviews" },
              { value: "10s", label: "Resume tailoring" },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl border border-border/60 bg-card/40 p-3 text-center">
                <p className="font-outfit text-xl font-bold gradient-text">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground/60">
          © 2026 JobIN. Apply Smarter, Get Hired Faster.
        </p>
      </div>

      {/* Right panel — Clerk sign-in */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-outfit text-xl font-bold gradient-text">JobIN</span>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-card/60 backdrop-blur-md border border-border/60 shadow-2xl shadow-black/40 rounded-2xl",
                headerTitle: "font-outfit font-bold text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton:
                  "border border-border bg-secondary/50 text-foreground hover:bg-secondary transition-all",
                formFieldLabel: "text-foreground text-sm font-medium",
                formFieldInput:
                  "bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground rounded-lg",
                formButtonPrimary:
                  "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg shadow-lg shadow-blue-500/20",
                footerActionLink: "text-primary hover:text-primary/80",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground text-xs",
                identityPreviewText: "text-foreground",
                formResendCodeLink: "text-primary",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
