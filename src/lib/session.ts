import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase-admin";
import type { PlatformRole, UserProfile } from "@/lib/platform-types";

const SESSION_COOKIE = "orquestra_session";
const platformRoles = new Set<PlatformRole>(["platform_owner", "orquestra_admin"]);

export async function getCurrentSession(): Promise<UserProfile | null> {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    const profile = await getFirebaseAdminDb().collection("users").doc(decoded.uid).get();

    if (!profile.exists) {
      return null;
    }

    const data = profile.data();
    if (!data?.active || !data.role || !data.email || !data.name) {
      return null;
    }

    return {
      uid: decoded.uid,
      name: data.name,
      email: data.email,
      role: data.role as PlatformRole,
      tenantId: data.tenantId ?? null,
      active: data.active,
    };
  } catch {
    return null;
  }
}

export async function requirePlatformAdmin() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?reason=signin_required");
  }

  if (!platformRoles.has(session.role)) {
    redirect("/login?reason=access_denied");
  }

  return session;
}

export async function requireTenantUser() {
  const session = await getCurrentSession();

  if (!session || !session.tenantId) {
    redirect("/login?reason=tenant_required");
  }

  return session;
}

export { SESSION_COOKIE };
