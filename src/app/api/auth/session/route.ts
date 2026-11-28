import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE } from "@/lib/session";
import { isPlatformAdminEmail } from "@/lib/platform-admins";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  const limit = await consumeRateLimit({ scope: "auth-session", ip: clientIp(request), limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas de acesso. Aguarde alguns minutos." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

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

    const db = getFirebaseAdminDb();
    const profile = await db.collection("users").doc(decoded.uid).get();
    let profileData = profile.data();

    // Desenvolvedor autorizado sem perfil ainda: cria o acesso de plataforma,
    // exigindo e-mail confirmado pelo provedor de login.
    if (!profile.exists && decoded.email && decoded.email_verified === true && isPlatformAdminEmail(decoded.email)) {
      const email = decoded.email.toLowerCase();
      const adminProfile = {
        uid: decoded.uid,
        name: decoded.name ?? email,
        email,
        role: "platform_owner",
        tenantId: null,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await db.collection("users").doc(decoded.uid).set(adminProfile);
      await db.collection("auditLogs").doc().set({
        tenantId: null,
        actorUserId: decoded.uid,
        actorRole: "platform_owner",
        action: "platform_admin.provisioned",
        targetType: "user",
        targetId: decoded.uid,
        createdAt: new Date().toISOString(),
        metadata: { email },
      });
      profileData = adminProfile;
    }

    if (!profileData && decoded.email) {
      const email = decoded.email.toLowerCase();
      const inviteSnapshot = await db.collection("userInvites").where("email", "==", email).limit(10).get();
      const invite = inviteSnapshot.docs.find((doc) => doc.data().active === true);

      if (invite) {
        const inviteData = invite.data();
        const newProfile = {
          uid: decoded.uid,
          name: decoded.name ?? email,
          email,
          role: inviteData.role ?? "company_owner",
          tenantId: inviteData.tenantId ?? null,
          active: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        const batch = db.batch();
        batch.set(db.collection("users").doc(decoded.uid), newProfile);
        batch.update(invite.ref, {
          active: false,
          acceptedAt: FieldValue.serverTimestamp(),
          acceptedByUid: decoded.uid,
        });
        await batch.commit();
        profileData = newProfile;
      }
    }

    if (!profileData?.active || !profileData.role) {
      return NextResponse.json({ error: "Este usuário ainda não possui acesso ao Portal." }, { status: 403 });
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const hasPlatformRole = ["platform_owner", "orquestra_admin"].includes(profileData.role);
    if (hasPlatformRole && !isPlatformAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "Este usuário não possui acesso à Central Admin." }, { status: 403 });
    }
    const isPlatformAdmin = hasPlatformRole;
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
