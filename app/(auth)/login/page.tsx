"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircle, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("אימייל או סיסמה שגויים");
        } else {
          setError(signInError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError("שגיאה בהתחברות");
        setIsLoading(false);
        return;
      }

      // Verify user is an active agent
      const response = await fetch("/api/auth/verify-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Sign out if not a valid agent
        await supabase.auth.signOut();
        setError(result.error || "אין לך הרשאות גישה למערכת");
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError("שגיאה בהתחברות, נסה שוב");
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
      <CardHeader className="text-center space-y-6 pb-2">
        {/* Logo with glow effect */}
        <div className="relative mx-auto">
          <div className="absolute inset-0 w-20 h-20 bg-brand-gradient rounded-2xl blur-xl opacity-50" />
          <div className="relative w-20 h-20 bg-brand-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform duration-300">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-brand-gradient">
            WhizChat
          </CardTitle>
          <CardDescription className="text-base">
            התחבר לדשבורד הנציגים
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 animate-shake">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              </div>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium">אימייל</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              dir="ltr"
              className="text-left h-12 rounded-xl border-border/60 bg-muted/30 focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium">סיסמה</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              dir="ltr"
              className="text-left h-12 rounded-xl border-border/60 bg-muted/30 focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-brand-gradient hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary/25 rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
                מתחבר...
              </>
            ) : (
              "התחבר"
            )}
          </Button>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            מערכת צ'אט חכמה לתמיכה בלקוחות
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
