import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const email = process.env.ORQUESTRA_PLATFORM_OWNER_EMAIL;
const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
const rawServiceAccount = filePath ? readFileSync(filePath, "utf8") : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!email || !rawServiceAccount) {
  throw new Error("Defina ORQUESTRA_PLATFORM_OWNER_EMAIL e FIREBASE_SERVICE_ACCOUNT_FILE (ou FIREBASE_SERVICE_ACCOUNT_JSON) antes de executar este comando.");
}

const serviceAccount = JSON.parse(rawServiceAccount);
const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);
const user = await auth.getUserByEmail(email);

await db.collection("users").doc(user.uid).set(
  {
    name: user.displayName || "Administrador Orquestra.cs",
    email: user.email,
    role: "platform_owner",
    tenantId: null,
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

console.log("Perfil platform_owner criado ou atualizado com sucesso.");
