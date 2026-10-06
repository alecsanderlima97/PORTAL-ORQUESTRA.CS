"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { BrandLogo } from "@/components/brand-logo";
import { getFirebaseClient, hasFirebaseClientConfig } from "@/lib/firebase";

type PasswordResetFormProps = {
  mode?: string;
  actionCode?: string;
  continueUrl?: string;
};

export default function PasswordResetForm({ mode, actionCode, continueUrl }: PasswordResetFormProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "success" | "error">("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function validateAction() {
      if (mode !== "resetPassword" || !actionCode || !hasFirebaseClientConfig) {
        if (isMounted) {
          setStatus("error");
          setMessage("Este link de redefinição não é válido. Solicite um novo link no Portal.");
        }
        return;
      }

      try {
        const { auth } = getFirebaseClient();
        const accountEmail = await verifyPasswordResetCode(auth, actionCode);
        if (isMounted) {
          setEmail(accountEmail);
          setStatus("ready");
        }
      } catch {
        if (isMounted) {
          setStatus("error");
          setMessage("Este link expirou ou já foi utilizado. Solicite uma nova redefinição.");
        }
      }
    }

    void validateAction();

    return () => {
      isMounted = false;
    };
  }, [actionCode, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!actionCode) return;
    if (password.length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { auth } = getFirebaseClient();
      await confirmPasswordReset(auth, actionCode, password);
      setStatus("success");
    } catch {
      setMessage("Não foi possível salvar essa senha. Solicite um novo link e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const backHref = continueUrl?.startsWith("http") ? continueUrl : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#061522] px-5 py-10 text-white">
      <div className="w-full max-w-[430px] rounded-xl border border-white/10 bg-[#0b2032]/90 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur sm:p-9">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-[#b8c7d1] transition hover:text-white">
          <ArrowLeft className="size-4" />
          Voltar ao login
        </Link>

        <div className="mt-10 flex items-center gap-3">
          <BrandLogo variant="essential" size={42} />
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-[#71c8ed]">ORQUESTRA.CS</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white">Acesso seguro</p>
          </div>
        </div>

        {status === "checking" ? (
          <div className="mt-10 space-y-3">
            <div className="h-7 w-48 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
            <div className="h-11 w-full animate-pulse rounded bg-white/10" />
          </div>
        ) : status === "success" ? (
          <div className="mt-10">
            <CheckCircle2 className="size-10 text-[#71c8ed]" />
            <h1 className="mt-5 text-2xl font-semibold">Senha definida com sucesso</h1>
            <p className="mt-3 text-sm leading-6 text-[#b4c5d0]">Agora você já pode acessar a Central Admin com seu e-mail e a nova senha.</p>
            <Link href="/login" className="mt-7 flex h-11 items-center justify-center rounded-md bg-[#087fba] text-sm font-semibold text-white transition hover:bg-[#076d9e]">
              Ir para o login
            </Link>
          </div>
        ) : status === "error" ? (
          <div className="mt-10">
            <h1 className="text-2xl font-semibold">Link indisponível</h1>
            <p className="mt-3 text-sm leading-6 text-[#b4c5d0]">{message}</p>
            <Link href="/login" className="mt-7 flex h-11 items-center justify-center rounded-md border border-[#5aaed2]/50 text-sm font-semibold text-white transition hover:bg-white/5">
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <div>
              <h1 className="text-2xl font-semibold">Criar nova senha</h1>
              <p className="mt-3 text-sm leading-6 text-[#b4c5d0]">Defina a senha de acesso para {email}.</p>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-[#b8c7d1]">Nova senha</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 focus-within:border-[#71c8ed]">
                <LockKeyhole className="size-4 text-[#8fb6cf]" />
                <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#8aa0af]" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-[#b8c7d1]">Confirmar senha</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 focus-within:border-[#71c8ed]">
                <LockKeyhole className="size-4 text-[#8fb6cf]" />
                <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#8aa0af]" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
              </span>
            </label>

            {message ? <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-xs leading-5 text-[#ffb3b3]">{message}</p> : null}

            <button type="submit" disabled={isSubmitting} className="flex h-11 w-full items-center justify-center rounded-md bg-[#087fba] text-sm font-semibold text-white transition hover:bg-[#076d9e] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Salvando senha..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        {status === "success" ? null : <p className="mt-8 text-center text-xs text-[#8fa4b1]">O link é individual e pode ser usado uma única vez.</p>}
        {status === "success" && backHref !== "/login" ? <Link href={backHref} className="sr-only">Continuar</Link> : null}
      </div>
    </main>
  );
}
