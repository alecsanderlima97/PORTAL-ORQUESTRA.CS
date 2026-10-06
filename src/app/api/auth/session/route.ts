import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  try {
    const { idToken, csrfToken } = await request.json();

    const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;

    if (
      typeof idToken !== "string"
      || !idToken
      || typeof csrfToken !== "string"
      || !csrfCookie
      || csrfToken !== csrfCookie
    ) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const now = Math.floor(Date.now() / 1000);

    if (!decoded.auth_time || now - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: "Faça login novamente para continuar." }, { status: 401 });
    }

    const profile = await getFirebaseAdminDb().collection("users").doc(decoded.uid).get();
    const profileData = profile.data();

    if (!profile.exists || !profileData?.active || !profileData.role) {
      return NextResponse.json({ error: "Este usuário ainda não possui acesso ao Portal." }, { status: 403 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const isPlatformAdmin = ["platform_owner", "orquestra_admin"].includes(profileData.role);
    const response = NextResponse.json({
      ok: true,
      destination: isPlatformAdmin ? "/central-admin" : "/portal",
    });

    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Não foi possível criar uma sessão segura." }, { status: 401 });
  }
}
