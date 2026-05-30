import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
