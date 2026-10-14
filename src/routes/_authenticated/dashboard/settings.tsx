import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSession } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — CapitalPeek" }] }),
  component: Settings,
});

const ROLE_HELP: Record<string, string> = {
  owner: "Manages members and the invite code. Full edit access.",
  editor: "Can create and change deals, contracts and scenarios.",
  viewer: "Read-only access to the workspace.",
};

function Settings() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile(user);
  const { data: roles } = useRoles(user);

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setJobTitle(profile.job_title ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim().slice(0, 150) || null,
          job_title: jobTitle.trim().slice(0, 150) || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      void queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const staffRoles = (roles ?? []).filter((r) => r === "admin" || r === "sales_manager");

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <h1 className="type-display-lg">Settings</h1>
        <p className="mt-3 text-sm text-muted-foreground">Your profile and workspace.</p>
      </div>

      <div className="glass-panel max-w-xl space-y-5 rounded-3xl p-6 sm:p-8">
        <h2 className="type-heading-md">Profile</h2>
        {isLoading ? (
          <>
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                maxLength={150}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Job title</Label>
              <Input
                id="title"
                maxLength={150}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Head of Sales"
              />
            </div>
            {staffRoles.length ? (
              <div className="space-y-2">
                <Label>Platform access</Label>
                <div className="flex flex-wrap gap-2">
                  {staffRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium capitalize text-primary ring-1 ring-primary/20"
                    >
                      {role.replace("_", " ")}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lets you review payments and website leads.
                </p>
              </div>
            ) : null}
            <Button className="press" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </>
        )}
      </div>

      {user && !isLoading ? <WorkspaceCard userId={user.id} /> : null}
    </div>
  );
}

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  company_role: string | null;
};

function WorkspaceCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useProfile(user);
  const companyId = profile?.company_id ?? null;
  const myRole = profile?.company_role ?? null;
  const isOwner = myRole === "owner";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Switching workspace changes what every other screen can see, so refresh everything.
  const refreshAll = () => void queryClient.invalidateQueries();
  const fail = (e: Error) => toast.error(e.message);

  const workspace = useQuery({
    queryKey: ["workspace", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["workspace-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, company_role")
        .eq("company_id", companyId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const invite = useQuery({
    queryKey: ["workspace-invite", companyId],
    enabled: !!companyId && isOwner,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invite_code");
      if (error) throw error;
      return data as string | null;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_workspace", { p_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workspace created");
      setName("");
      refreshAll();
    },
    onError: fail,
  });

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("join_workspace", { p_code: code });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You joined the workspace as a viewer");
      setCode("");
      refreshAll();
    },
    onError: fail,
  });

  const leave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("leave_workspace");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You left the workspace");
      refreshAll();
    },
    onError: fail,
  });

  const setRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase.rpc("set_member_role", { p_user: id, p_role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      refreshAll();
    },
    onError: fail,
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("remove_member", { p_user: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      refreshAll();
    },
    onError: fail,
  });

  const rotate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("rotate_invite_code");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("New invite code generated. The old one no longer works.");
      void queryClient.invalidateQueries({ queryKey: ["workspace-invite"] });
    },
    onError: fail,
  });

  const copyCode = async () => {
    if (!invite.data) return;
    try {
      await navigator.clipboard.writeText(invite.data);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it manually.");
    }
  };

  if (!companyId) {
    return (
      <div className="glass-panel max-w-xl space-y-6 rounded-3xl p-6 sm:p-8">
        <div>
          <h2 className="type-heading-md">Workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You're working on your own. Create a workspace to share deals, contracts and scenarios
            with teammates, or join one with an invite code. Your existing data moves into a
            workspace you create.
          </p>
        </div>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Label htmlFor="ws-name">Create a workspace</Label>
          <div className="flex gap-2">
            <Input
              id="ws-name"
              placeholder="Company name"
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" className="press" disabled={create.isPending || !name.trim()}>
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            join.mutate();
          }}
        >
          <Label htmlFor="ws-code">Join with an invite code</Label>
          <div className="flex gap-2">
            <Input
              id="ws-code"
              placeholder="e.g. 3f9a1c7b2d40"
              maxLength={32}
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              className="press"
              disabled={join.isPending || !code.trim()}
            >
              {join.isPending ? "Joining…" : "Join"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            New members start as viewers. The owner can promote you.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel max-w-2xl space-y-6 rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="type-heading-md">{workspace.data?.name ?? "Workspace"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your role: <span className="font-medium capitalize text-foreground">{myRole}</span>.{" "}
            {myRole ? ROLE_HELP[myRole] : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="press"
          disabled={leave.isPending}
          onClick={() => {
            if (confirm("Leave this workspace? You will lose access to its shared data."))
              leave.mutate();
          }}
        >
          Leave workspace
        </Button>
      </div>

      {isOwner ? (
        <div className="space-y-2 rounded-2xl border border-border/70 p-4">
          <Label>Invite code</Label>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-muted px-3 py-2 font-mono text-sm">
              {invite.isLoading ? "…" : (invite.data ?? "unavailable")}
            </code>
            <Button size="sm" variant="outline" onClick={copyCode} disabled={!invite.data}>
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={rotate.isPending}
              onClick={() => {
                if (confirm("Generate a new code? The current code will stop working."))
                  rotate.mutate();
              }}
            >
              <RefreshCw className="size-4" /> New code
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share it with teammates. They enter it in Settings and join as viewers.
          </p>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Members</h3>
        {members.isLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/70">
            {(members.data ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {m.full_name || m.email || "Member"}
                    {m.id === userId ? (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
                {isOwner && m.id !== userId ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.company_role ?? "viewer"}
                      onValueChange={(role) => {
                        if (
                          role !== "owner" ||
                          confirm("Make this person the owner? You will become an editor.")
                        )
                          setRole.mutate({ id: m.id, role });
                      }}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${m.full_name || m.email || "member"}`}
                      disabled={removeMember.isPending}
                      onClick={() => {
                        if (confirm(`Remove ${m.full_name || m.email} from the workspace?`))
                          removeMember.mutate(m.id);
                      }}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium capitalize text-primary ring-1 ring-primary/20">
                    {m.company_role ?? "viewer"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
