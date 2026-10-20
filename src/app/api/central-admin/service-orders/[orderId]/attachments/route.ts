import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminDb, getFirebaseAdminStorage } from "@/lib/firebase-admin";
import { getCurrentSession } from "@/lib/session";

const platformRoles = new Set(["platform_owner", "orquestra_admin"]);
const maxFileSize = 8 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const session = await getCurrentSession();
  if (!session || !platformRoles.has(session.role)) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const csrfCookie = (await cookies()).get("orquestra_csrf")?.value;
  const form = await request.formData();
  if (form.get("csrfToken") !== csrfCookie) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma foto ou documento." }, { status: 400 });
  if (file.size > maxFileSize) return NextResponse.json({ error: "O arquivo deve ter no máximo 8 MB." }, { status: 400 });
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") return NextResponse.json({ error: "Anexe uma imagem ou PDF." }, { status: 400 });
  const { orderId } = await context.params;
  const db = getFirebaseAdminDb();
  const orderRef = db.collection("serviceOrders").doc(orderId);
  const order = await orderRef.get();
  if (!order.exists) return NextResponse.json({ error: "Ordem de serviço não encontrada." }, { status: 404 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "anexo";
  const storagePath = `service-orders/${orderId}/${Date.now()}-${safeName}`;
  const storageFile = getFirebaseAdminStorage().file(storagePath);
  await storageFile.save(Buffer.from(await file.arrayBuffer()), { metadata: { contentType: file.type, metadata: { uploadedBy: session.uid, orderId } } });
  const [downloadUrl] = await storageFile.getSignedUrl({ action: "read", expires: Date.now() + 1000 * 60 * 60 * 24 * 365 });
  const attachment = { id: storagePath.split("/").pop() || storagePath, name: file.name.slice(0, 160), contentType: file.type, size: file.size, storagePath, downloadUrl, createdAt: new Date().toISOString() };
  await orderRef.update({ attachments: FieldValue.arrayUnion(attachment), updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ attachment });
}
