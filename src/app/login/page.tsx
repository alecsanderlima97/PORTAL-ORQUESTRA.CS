import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";

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

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
