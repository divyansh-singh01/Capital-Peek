import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Network hiccups must not look like "signed out". Only a rejected session should.
function isTransientAuthError(error: { name?: string | undefined; status?: number | undefined }) {
  return (
    error.name === "AuthRetryableFetchError" ||
    error.status === 0 ||
    error.status === undefined ||
    error.status >= 500 ||
    error.status === 429
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const toSignIn = () =>
      redirect({
        to: "/auth",
        search: { redirect: location.href },
        replace: true,
      });

    // 1. Fast local check: no stored session means signed out.
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) throw toSignIn();

    // 2. Verify with the server so revoked / deleted-user sessions are caught.
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Offline or server blip: trust the stored session instead of bouncing the user.
      if (isTransientAuthError(error)) return { user: session.user };
      // Session rejected by the server: clear it locally. Without this the /auth page
      // still finds the stale session, sends the user back here, and it loops forever.
      await supabase.auth.signOut({ scope: "local" });
      throw toSignIn();
    }
    if (!data.user) throw toSignIn();
    return { user: data.user };
  },
  component: () => <Outlet />,
});
