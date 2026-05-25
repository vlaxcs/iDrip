import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
  accent?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  className,
  accent = false,
}: StatCardProps) {
  return (
    <div className={cn("kit-card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="kit-overline">{label}</p>
          <p className="kit-display font-sans text-3xl mt-2.5 truncate">{value}</p>
          {subtitle && (
            <p className="text-xs kit-muted mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("kit-icon-box flex-shrink-0", accent && "kit-icon-box-accent")}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
    </div>
  );
}
