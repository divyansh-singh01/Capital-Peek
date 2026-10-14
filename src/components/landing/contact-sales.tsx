import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(150),
  email: z.string().trim().email("Enter a valid work email").max(254),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().max(1000).optional(),
});

/** "Talk to sales": stores an enquiry as a lead so staff can follow up from the dashboard. */
export function ContactSalesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [trap, setTrap] = useState(""); // honeypot: real people never fill this in
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (trap) {
      setDone(true); // silently drop bots
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      full_name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company || null,
      inputs: { source: "enterprise-enquiry", message: parsed.data.message ?? "" },
    });
    setSaving(false);
    if (error) {
      toast.error("We couldn't send that. Please try again.");
      return;
    }
    setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Talk to sales</DialogTitle>
          <DialogDescription>
            Tell us about your team and what you need. We'll reply by email.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <p className="text-sm text-muted-foreground">
              Thanks! Your enquiry is in. We'll get back to {form.email || "you"} soon.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cs-name">Name</Label>
              <Input
                id="cs-name"
                required
                maxLength={150}
                value={form.name}
                onChange={set("name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-email">Work email</Label>
              <Input
                id="cs-email"
                type="email"
                required
                maxLength={254}
                value={form.email}
                onChange={set("email")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-company">Company</Label>
              <Input
                id="cs-company"
                maxLength={160}
                value={form.company}
                onChange={set("company")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-message">What do you need?</Label>
              <Textarea
                id="cs-message"
                rows={3}
                maxLength={1000}
                value={form.message}
                onChange={set("message")}
              />
            </div>
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
              name="website"
            />
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Sending…" : "Send enquiry"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
