import { useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { RoiInputs, RoiResults } from "@/lib/roi";

export function LeadCaptureForm({
  inputs,
  results,
}: {
  inputs: RoiInputs;
  results: RoiResults;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [trap, setTrap] = useState(""); // honeypot field, hidden from people
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || cleanEmail.length > 254) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (trap) {
      setDone(true); // silently drop bots
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      full_name: name.trim().slice(0, 150) || null,
      email: cleanEmail,
      company: company.trim().slice(0, 200) || null,
      inputs: inputs as unknown as Record<string, number>,
      extra_revenue_year: Math.round(results.extraRevenueYear),
      roi_percent: Math.round(results.roiPercent),
    });
    setSaving(false);
    if (error) {
      toast.error("We couldn't save that. Please try again.");
      return;
    }
    setDone(true);
    toast.success("Request received.");
  };

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-success/40 bg-card/70 p-4">
        <CheckCircle2 className="mt-0.5 size-5 text-success" />
        <div>
          <div className="text-sm font-semibold">Thanks, {name || "there"}!</div>
          <p className="text-sm text-muted-foreground">
            We've recorded your request and will follow up at {email}. You can download the PDF audit above right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="relative rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Mail className="size-4 text-primary" />
        Get help reviewing your ROI estimate
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Share your email if you would like our team to follow up about your scenario. You can still download the report without submitting this form.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          type="email"
          required
          placeholder="Work email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        name="website"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
      />
      <Button type="submit" className="mt-3 w-full" disabled={saving}>
        {saving ? "Sending…" : "Request a follow-up"}
      </Button>
    </form>
  );
}
