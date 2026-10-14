import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  company_id: string | null;
  company_role: "owner" | "editor" | "viewer" | null;
};

export function useProfile(user: User | null) {
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, job_title, avatar_url, company_id, company_role")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });
}

export function useRoles(user: User | null) {
  return useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as string);
    },
  });
}

/**
 * UI-level permission hint. The database is the real gate (RLS + triggers); this only decides
 * whether to show create/edit controls so view-only members do not hit avoidable errors.
 * Users without a workspace work on their own personal data and can always write.
 */
export function useCanEdit(user: User | null) {
  const profile = useProfile(user);
  const roles = useRoles(user);
  const loaded = !!profile.data || profile.isError || roles.isError;
  const isStaff = (roles.data ?? []).some((r) => r === "admin" || r === "sales_manager");
  const role = profile.data?.company_role ?? null;
  const canEdit = !profile.data?.company_id || role === "owner" || role === "editor" || isStaff;
  return { canEdit, isStaff, workspaceRole: role, loaded };
}
