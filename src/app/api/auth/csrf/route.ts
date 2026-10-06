import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET() {
  const csrfToken = randomBytes(32).toString("hex");
  const response = NextResponse.json({ csrfToken });

  response.cookies.set("orquestra_csrf", csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
