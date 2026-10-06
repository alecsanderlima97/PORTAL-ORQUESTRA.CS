import type { ReactNode } from "react";
import { requirePlatformAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CentralAdminLayout({ children }: { children: ReactNode }) {
  await requirePlatformAdmin();
  return children;
}
