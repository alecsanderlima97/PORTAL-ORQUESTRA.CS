"use client";

import { Printer } from "lucide-react";

export function PrintServiceOrderButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-[#12345b] px-4 py-2 text-sm font-semibold text-white"><Printer className="size-4" /> Imprimir / salvar PDF</button>;
}
