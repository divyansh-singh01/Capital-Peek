import markUrl from "@/assets/capitalpeek-mark.png";
import { cn } from "@/lib/utils";

/** CapitalPeek brand mark + wordmark. Swap the image in src/assets to rebrand. */
export function BrandLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src={markUrl}
        alt="CapitalPeek logo"
        width={36}
        height={36}
        className={cn("size-9 object-contain drop-shadow-sm", markClassName)}
      />
      <span className="text-base font-semibold tracking-tight">
        <span className="text-[#e30b20]">Capital</span>
        <span className="text-muted-foreground">Peek</span>
      </span>
    </span>
  );
}
