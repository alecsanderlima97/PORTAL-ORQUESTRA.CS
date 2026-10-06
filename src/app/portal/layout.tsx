import type { ReactNode } from "react";
import { requireTenantUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ClientPortalLayout({ children }: { children: ReactNode }) {
  await requireTenantUser();
  return children;
}
