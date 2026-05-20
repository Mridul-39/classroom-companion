import { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-white/50 border-dashed min-h-[300px]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 mb-4">
        <Icon className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm text-zinc-500 mt-2 max-w-sm">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={buttonVariants({ variant: "outline", className: "mt-6" })}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
