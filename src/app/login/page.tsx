import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#f7f8f5] text-zinc-950 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between bg-zinc-950 p-6 text-white sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <div className="my-12 max-w-xl">
          <BrandLogo variant="essential" size={54} showWordmark tone="light" />
          <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
            Entrar no Portal Orquestra.cs
          </h1>
          <p className="mt-5 leading-7 text-zinc-300">
            Acesso central para clientes, administradores e equipe Orquestra.cs. Na primeira fase,
            o portal libera os sistemas contratados sem alterar os sistemas existentes.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 p-4">
            <ShieldCheck className="size-5 text-emerald-300" />
            <p className="mt-3 font-semibold text-white">Multiempresa</p>
            <p className="mt-1">Cada usuário pertence a uma empresa ou ao admin da Orquestra.cs.</p>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <LockKeyhole className="size-5 text-emerald-300" />
            <p className="mt-3 font-semibold text-white">Permissão por perfil</p>
            <p className="mt-1">Cliente não acessa a Central Admin nem cruza dados de outro tenant.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/70">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Acesso seguro</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Login</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Tela visual preparada para Firebase Auth. Os dados reais entram depois da configuração
              do projeto Firebase.
            </p>
          </div>
          <form className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">E-mail</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3">
                <Mail className="size-4 text-zinc-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  placeholder="cliente@empresa.com.br"
                  type="email"
                />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Senha</span>
              <span className="mt-2 flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3">
                <LockKeyhole className="size-4 text-zinc-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  placeholder="Sua senha"
                  type="password"
                />
              </span>
            </label>
            <Link
              href="/portal"
              className="flex h-11 w-full items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Entrar como cliente demo
            </Link>
            <Link
              href="/central-admin"
              className="flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Entrar como Admin Orquestra.cs
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}
