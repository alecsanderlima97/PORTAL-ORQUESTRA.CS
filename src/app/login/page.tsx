import Link from "next/link";
import { ArrowLeft, Eye, LockKeyhole, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f5f8fc] text-[#071b2a] lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <section className="relative flex min-h-[620px] flex-col overflow-hidden bg-[#061522] px-8 py-8 text-white sm:px-12 lg:min-h-screen lg:px-16 lg:py-9">
        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
          <div className="absolute -left-20 top-1/2 h-80 w-80 rounded-full bg-[#0b5b84]/20 blur-[120px]" />
          <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-[#1684ae]/10 blur-[110px]" />
          <div className="absolute left-0 right-0 top-[38%] h-px bg-gradient-to-r from-transparent via-[#1e89b5]/20 to-transparent" />
        </div>

        <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2 text-sm text-[#b8c7d1] transition hover:text-white">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <div className="relative z-10 mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center py-16 lg:mx-0 lg:py-10">
          <div className="mb-8 flex items-center gap-3">
            <BrandLogo variant="essential" size={42} />
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#71c8ed]">ORQUESTRA.CS</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-white">Portal</p>
            </div>
          </div>
          <p className="mb-3 text-sm font-semibold text-[#86c9e7]">Acesso central</p>
          <h1 className="max-w-[580px] text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.6rem] lg:leading-[1.03]">
            Entre no ecossistema Orquestra.cs.
          </h1>
          <p className="mt-6 max-w-[520px] text-base leading-7 text-[#b4c5d0]">
            Um único acesso para os sistemas, serviços e soluções que mantêm a sua operação em sintonia.
          </p>
          <div className="mt-12 grid max-w-[620px] gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-sm font-semibold text-white">Acesso por empresa</p>
              <p className="mt-1 text-xs leading-5 text-[#9db1be]">Cada cliente vê somente os sistemas contratados.</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-sm font-semibold text-white">Operação integrada</p>
              <p className="mt-1 text-xs leading-5 text-[#9db1be]">Tecnologia, gestão e automação em um só portal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="w-full max-w-[380px] rounded-md border border-[#dbe3ea] bg-white p-6 shadow-[0_18px_45px_rgba(16,40,60,0.09)] sm:p-7">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#087da6]">ACESSO SEGURO</p>
          <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.02em] text-[#071b2a]">Acessar portal</h2>
          <p className="mt-2 text-xs leading-5 text-[#667b8b]">Entre com seu usuário para acessar os sistemas liberados para sua empresa.</p>

          <form className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[#294052]">E-mail</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d7e0e7] bg-white px-3 transition-within:border-[#2b9ac2]">
                <Mail className="size-4 text-[#8b9baa]" />
                <input className="w-full bg-transparent text-sm text-[#071b2a] outline-none placeholder:text-[#98a8b4]" placeholder="cliente@empresa.com.br" type="email" aria-label="E-mail" />
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#294052]">Senha</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-[#d7e0e7] bg-white px-3 transition-within:border-[#2b9ac2]">
                <LockKeyhole className="size-4 text-[#8b9baa]" />
                <input className="w-full bg-transparent text-sm text-[#071b2a] outline-none placeholder:text-[#98a8b4]" placeholder="Sua senha" type="password" aria-label="Senha" />
                <button type="button" className="text-[#778c9c] transition hover:text-[#087da6]" aria-label="Mostrar senha"><Eye className="size-4" /></button>
              </span>
            </label>
            <div className="flex justify-end"><button type="button" className="text-xs font-semibold text-[#087da6] hover:text-[#075f7f]">Esqueci minha senha</button></div>
            <Link href="/portal" className="flex h-11 w-full items-center justify-center rounded-md bg-[#087fba] text-sm font-semibold text-white transition hover:bg-[#076d9e]">Entrar</Link>
            <button type="button" className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d7e0e7] text-xs font-semibold text-[#173348] transition hover:bg-[#f5f9fb]"><span className="flex size-5 items-center justify-center rounded-full border border-[#dbe3ea] text-[11px] font-bold text-[#4285f4]">G</span>Continuar com Google</button>
            <button type="button" className="block w-full text-center text-xs font-semibold text-[#087da6] hover:text-[#075f7f]">Ainda não tenho uma conta</button>
            <Link href="/portal" className="flex h-10 w-full items-center justify-center rounded-md border border-[#c9d7e1] text-xs font-medium text-[#325166] transition hover:bg-[#f5f9fb]">Entrar em modo demo</Link>
          </form>
        </div>
      </section>
    </main>
  );
}
