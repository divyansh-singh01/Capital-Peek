import { BrandLogo } from "@/components/brand-logo";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";

const TITLE = "Sign in — CapitalPeek";
const DESCRIPTION =
  "Sign in to CapitalPeek to save ROI scenarios, manage your pipeline and share reports with your team.";

// Only follow same-site, non-auth paths so ?redirect= can never become an open redirect.
function safeRedirect(target?: string) {
  return target && target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/auth")
    ? target
    : "/dashboard";
}

function friendlyAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("already registered"))
    return "An account with this email already exists. Sign in instead, or reset your password.";
  if (m.includes("password should be") || m.includes("weak password"))
    return "That password is too weak. Use at least 8 characters with letters and numbers.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Google sign-in isn't switched on for this site yet.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Couldn't reach the server. Check your connection and try again.";
  return message;
}

const MIN_PASSWORD = 8;

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  // Send the user where they were headed (or the dashboard) once signed in.
  const goNext = useCallback(() => {
    router.history.push(safeRedirect(redirect));
  }, [router, redirect]);

  // Links in emails and the Google round-trip come back to /auth, which signs the user in and
  // forwards them (previously they landed on the marketing page, still looking signed out).
  const returnUrl = () => {
    const target = safeRedirect(redirect);
    const query = target === "/dashboard" ? "" : `?redirect=${encodeURIComponent(target)}`;
    return `${window.location.origin}/auth${query}`;
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) goNext();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // A recovery link must land on the set-new-password form, not the dashboard.
      if (event === "PASSWORD_RECOVERY") {
        navigate({ to: "/reset-password" });
        return;
      }
      if (session) goNext();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [goNext, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNeedsConfirm(false);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("not confirmed")) {
        setNeedsConfirm(true);
        toast.error("Please confirm your email first. We can resend the link.");
      } else {
        toast.error(friendlyAuthError(error.message));
      }
    }
  };

  const resendConfirmation = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: returnUrl() },
    });
    setBusy(false);
    if (error) toast.error(friendlyAuthError(error.message));
    else toast.success("Confirmation email sent. Check your inbox.");
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email above, then click “Forgot password?”.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(friendlyAuthError(error.message));
    else toast.success("If that email has an account, a reset link is on its way.");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      toast.error(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: returnUrl(),
        data: { full_name: fullName.trim().slice(0, 150) },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyAuthError(error.message));
      return;
    }
    // With email confirmation on, Supabase hides existing accounts: no error, but no identities.
    if (data.user && data.user.identities?.length === 0) {
      toast.error(
        "An account with this email already exists. Sign in instead, or reset your password.",
      );
      return;
    }
    if (!data.session) {
      toast.success("Check your inbox to confirm your email address.");
    }
  };

  const magicLink = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: returnUrl() },
    });
    setBusy(false);
    if (error) toast.error(friendlyAuthError(error.message));
    else toast.success("Magic link sent — check your email.");
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: returnUrl() },
      });
      if (error) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      return; // browser is redirected to Google
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to site
        </Link>

        <Card className="rounded-3xl border-border/70 p-7 shadow-lift">
          <BrandLogo />

          <Tabs defaultValue="signin" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-5">
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={forgotPassword}
                      disabled={busy}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Sign in
                </Button>
                {needsConfirm ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={resendConfirmation}
                    disabled={busy}
                  >
                    Resend confirmation email
                  </Button>
                ) : null}
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={signUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={150}
                    placeholder="Alex Moreau"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Work email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={MIN_PASSWORD}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
              <GoogleMark />
              Continue with Google
            </Button>
            <Button variant="ghost" className="w-full" onClick={magicLink} disabled={busy}>
              <Mail className="size-4" />
              Email me a magic link
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
