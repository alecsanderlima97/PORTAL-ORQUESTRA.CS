import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

function getServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  const raw = filePath ? readFileSync(filePath, "utf8") : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error("A credencial administrativa do Firebase não foi configurada.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não contém um JSON válido.");
  }
}

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  return initializeApp({ credential: cert(getServiceAccount()) });
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getAdminApp());
}
