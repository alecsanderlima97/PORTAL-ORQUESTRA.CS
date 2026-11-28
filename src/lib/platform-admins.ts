// Únicas contas com acesso à Central Admin (desenvolvedor da Orquestra.cs).
// A lista é a fronteira: um perfil com papel de plataforma fora dela não entra.
export const PLATFORM_ADMIN_EMAILS = new Set(["orquestracs@gmail.com", "limaalecsander@gmail.com"]);

export function isPlatformAdminEmail(email: unknown) {
  return typeof email === "string" && PLATFORM_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
