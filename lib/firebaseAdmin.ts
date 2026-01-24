import admin from "firebase-admin";

let app: admin.app.App | null = null;

if (!admin.apps.length) {
  const projectId = process.env.NEXT_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.NEXT_FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.NEXT_FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    console.warn(
      "[firebaseAdmin] FIREBASE_* env vars not fully set. Firestore will not work."
    );
  } else {
    // Replace escaped newlines so the key becomes valid again
    const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log("[firebaseAdmin] Initialized for project:", projectId);
  }
} else {
  app = admin.app();
}

export const adminApp = app;
export const db = app ? admin.firestore() : null;