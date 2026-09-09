import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

const statusClasses = {
  ativo: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  teste: "bg-blue-50 text-blue-700 ring-blue-100",
  em_teste: "bg-blue-50 text-blue-700 ring-blue-100",
  vencendo: "bg-amber-50 text-amber-800 ring-amber-100",
  inadimplente: "bg-orange-50 text-orange-800 ring-orange-100",
  bloqueado: "bg-red-50 text-red-700 ring-red-100",
  planejado: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

type StatusKey = keyof typeof statusClasses;

export function StatusPill({ status, label }: { status: StatusKey; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[status]}`}
    >
      {label ?? status.replace("_", " ")}
    </span>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
    >
      {children}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
    >
      {children}
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-zinc-600">{description}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}
