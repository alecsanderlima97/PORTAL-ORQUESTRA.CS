"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import {
  GoogleAuthProvider,
  inMemoryPersistence,
  linkWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseClient, hasFirebaseClientConfig } from "@/lib/firebase";

type SessionResponse = {
  destination?: string;
  error?: string;
};

async function establishPortalSession(idToken: string) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken?: string };

  if (!csrfResponse.ok || !csrfToken) {
    throw new Error("Não foi possível iniciar a sessão segura.");
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, csrfToken }),
  });
  const result = (await response.json()) as SessionResponse;

  if (!response.ok || !result.destination) {
    throw new Error(result.error ?? "Não foi possível liberar seu acesso.");
  }

  return result.destination;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handlePasswordReset() {
    setMessage(null);

    if (!email.trim()) {
      setMessage("Digite seu e-mail para redefinir a senha.");
      return;
    }

    if (!hasFirebaseClientConfig) {
      setMessage("O acesso seguro ainda está sendo configurado neste ambiente.");
      return;
    }

    setIsResetting(true);

    try {
      const { auth } = getFirebaseClient();
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha.");
    } catch {
      setMessage("Não foi possível solicitar a redefinição agora. Tente novamente.");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage(null);

    if (!hasFirebaseClientConfig) {
      setMessage("O acesso seguro ainda está sendo configurado neste ambiente.");
      return;
    }

    setIsSubmitting(true);
    const { auth } = getFirebaseClient();

    try {
      await setPersistence(auth, inMemoryPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const destination = await establishPortalSession(await credential.user.getIdToken());
      window.location.assign(destination);
    } catch (error) {
      const code = (error as { code?: string }).code;

      if (code === "auth/popup-closed-by-user") {
        setMessage("A entrada com Google foi cancelada.");
      } else if (code === "auth/operation-not-allowed") {
        setMessage("A entrada com Google ainda não foi ativada no Portal.");
      } else if (code === "auth/account-exists-with-different-credential") {
        const pendingCredential = GoogleAuthProvider.credentialFromError(
          error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
        );

        if (!pendingCredential) {
          setMessage("Essa conta já existe com outro método de acesso. Entre com e-mail e senha para continuar.");
        } else if (!email.trim() || !password) {
          setMessage("Essa conta já existe com e-mail e senha. Informe os dois campos e tente entrar com Google novamente para fazer a vinculação única.");
        } else {
          try {
            const existingCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            await linkWithCredential(existingCredential.user, pendingCredential);
            const destination = await establishPortalSession(await existingCredential.user.getIdToken());
            window.location.assign(destination);
            return;
          } catch {
            setMessage("Não foi possível vincular o Google a esta conta. Confira o e-mail e a senha e tente novamente.");
          }
        }
      } else if (error instanceof Error && error.message !== "") {
        setMessage(error.message);
      } else {
        setMessage("Não foi possível entrar com Google. Verifique se sua conta possui acesso ao Portal.");
      }
    } finally {
      await signOut(auth).catch(() => undefined);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!hasFirebaseClientConfig) {
      setMessage("O acesso seguro ainda está sendo configurado neste ambiente.");
      return;
    }

    setIsSubmitting(true);

    const { auth } = getFirebaseClient();

    try {
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const destination = await establishPortalSession(await credential.user.getIdToken());
      window.location.assign(destination);
    } catch (error) {
      if (error instanceof Error && error.message !== "") {
        setMessage(error.message);
      } else {
        setMessage("E-mail ou senha não conferem. Tente novamente.");
      }
    } finally {
      await signOut(auth).catch(() => undefined);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting || isResetting}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-[#cbd8e2] bg-white text-sm font-semibold text-[#173044] transition hover:border-[#79b9d5] hover:bg-[#f7fbfd] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex size-5 items-center justify-center rounded-full border border-[#d9e2e8] text-xs font-bold text-[#4285f4]" aria-hidden="true">G</span>
        Continuar com Google
      </button>
      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-[#e1e8ed]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9aa9b4]">ou use e-mail</span>
        <span className="h-px flex-1 bg-[#e1e8ed]" />
      </div>
      <label className="block">
        <span className="text-xs font-medium text-[#294052]">E-mail</span>
        <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d7e0e7] bg-white px-3 transition focus-within:border-[#2b9ac2]">
          <Mail className="size-4 text-[#8b9baa]" />
          <input
            className="w-full bg-transparent text-sm text-[#071b2a] outline-none placeholder:text-[#98a8b4]"
            placeholder="cliente@empresa.com.br"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </span>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-[#294052]">Senha</span>
        <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d7e0e7] bg-white px-3 transition focus-within:border-[#2b9ac2]">
          <LockKeyhole className="size-4 text-[#8b9baa]" />
          <input
            className="w-full bg-transparent text-sm text-[#071b2a] outline-none placeholder:text-[#98a8b4]"
            placeholder="Sua senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="text-[#778c9c] transition hover:text-[#087da6]"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      <div className="flex justify-end">
        <button type="button" className="text-xs font-semibold text-[#087da6] hover:text-[#075f7f]" onClick={handlePasswordReset} disabled={isResetting || isSubmitting}>
          {isResetting ? "Enviando instruções..." : "Esqueci minha senha"}
        </button>
      </div>
      {message ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{message}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center rounded-md bg-[#087fba] text-sm font-semibold text-white transition hover:bg-[#076d9e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Validando acesso..." : "Entrar"}
      </button>
      <p className="text-center text-xs leading-5 text-[#667b8b]">
        O acesso é liberado pela Orquestra.cs conforme a empresa e as permissões do seu perfil.
      </p>
    </form>
  );
}
