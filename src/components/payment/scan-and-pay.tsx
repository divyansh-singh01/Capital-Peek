import { useState } from "react";
import { Check, CheckCircle2, Copy, Loader2, QrCode, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_CONFIG } from "@/lib/payment-config";

const schema = z.object({
  clientName: z.string().trim().min(1, "Enter your name or business name").max(150),
  contact: z
    .string()
    .trim()
    .min(3, "Enter an email or phone number we can reach you on")
    .max(200),
  amount: z.coerce.number().positive("Enter the amount you paid").max(100000000),
  utr: z.string().trim().max(64).optional(),
});

function QrDisplay() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative mx-auto aspect-[1080/1670] w-full max-w-[240px] overflow-hidden rounded-2xl border border-border bg-muted shadow-lift">
      {!loaded && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center">
          <QrCode className="size-10 text-muted-foreground" />
        </div>
      )}
      <img
        src={PAYMENT_CONFIG.qrImageUrl}
        alt={`UPI payment QR code for ${PAYMENT_CONFIG.payeeName}`}
        onLoad={() => setLoaded(true)}
        className={`size-full object-contain transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

function CopyUpi() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_CONFIG.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy. Please copy it manually.");
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 pl-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">UPI ID</div>
        <div className="truncate font-mono text-sm font-semibold">{PAYMENT_CONFIG.upiId}</div>
      </div>
      <div className="relative">
        {copied && (
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background">
            Copied!
          </span>
        )}
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function ConfirmForm({ plan, defaultAmount }: { plan?: string | undefined; defaultAmount?: number | undefined }) {
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [utr, setUtr] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ clientName, contact, amount, utr: utr || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (file && (file.size > 5 * 1024 * 1024 || !file.type.startsWith("image/"))) {
      toast.error("Screenshot must be an image under 5 MB.");
      return;
    }
    setSaving(true);
    let proofPath: string | null = null;
    if (file) {
      const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
      const ext = ["png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "bmp"].includes(rawExt) ? rawExt : "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (error) {
        setSaving(false);
        toast.error("Screenshot upload failed. Please try again.");
        return;
      }
      proofPath = path;
    }
    const { error } = await supabase.from("payment_submissions").insert({
      client_name: parsed.data.clientName,
      contact: parsed.data.contact,
      amount: parsed.data.amount,
      currency,
      utr: parsed.data.utr ?? null,
      proof_path: proofPath,
      plan: plan ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "That transaction ID has already been submitted. If this is a mistake, contact us."
          : "We couldn't submit that. Please try again.",
      );
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center animate-in fade-in zoom-in-95">
        <div className="flex size-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="size-9 text-success" />
        </div>
        <h3 className="text-lg font-semibold">Payment submitted for verification</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Thanks, {clientName}! We'll verify your payment and contact you at {contact}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-sm font-semibold">Already paid? Confirm your payment</div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-name">Name / Business name</Label>
        <Input id="pay-name" required maxLength={150} value={clientName} onChange={(e) => setClientName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-contact">Your email or phone</Label>
        <Input id="pay-contact" required minLength={3} maxLength={200} placeholder="so we can confirm with you" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-amount">Amount paid</Label>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-input p-0.5">
            {(["INR", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`rounded px-2.5 text-sm font-medium ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {c === "INR" ? "₹" : "$"}
              </button>
            ))}
          </div>
          <Input id="pay-amount" type="number" inputMode="decimal" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-utr">
          Transaction ID / UTR <span className="text-muted-foreground">(recommended)</span>
        </Label>
        <Input id="pay-utr" maxLength={64} placeholder="e.g. 412345678901" value={utr} onChange={(e) => setUtr(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-proof">
          Payment screenshot <span className="text-muted-foreground">(optional)</span>
        </Label>
        <label
          htmlFor="pay-proof"
          className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent"
        >
          <Upload className="size-4" />
          <span className="truncate">{file ? file.name : "Upload image (max 5 MB)"}</span>
        </label>
        <input id="pay-proof" type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        {saving ? "Submitting…" : "Confirm Payment"}
      </Button>
    </form>
  );
}

export function ScanAndPay({ plan, amount }: { plan?: string | undefined; amount?: number | undefined }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <QrDisplay />
        <p className="text-center text-sm text-muted-foreground">
          Scan using any UPI app — {PAYMENT_CONFIG.apps.join(" / ")}
        </p>
        <p className="text-center text-xs text-muted-foreground md:hidden">
          On your phone? Copy the UPI ID below and paste it in your UPI app.
        </p>
        <CopyUpi />
        <p className="text-center text-xs text-muted-foreground">
          Paying to <span className="font-semibold text-foreground">{PAYMENT_CONFIG.payeeName}</span>
          {amount ? <> · ₹{amount.toLocaleString("en-IN")}</> : null}
        </p>
      </div>
      <ConfirmForm plan={plan} defaultAmount={amount} />
    </div>
  );
}

export function ScanAndPayDialog({
  open,
  onOpenChange,
  plan,
  amount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan?: string | undefined;
  amount?: number | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" /> Scan & Pay
          </DialogTitle>
          <DialogDescription>
            {plan ? `${plan} plan · ` : ""}Pay securely via UPI, then confirm below.
          </DialogDescription>
        </DialogHeader>
        <ScanAndPay plan={plan} amount={amount} />
      </DialogContent>
    </Dialog>
  );
}
