"use client";

import { getApp, getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let clientApp: FirebaseApp;
let clientAuth: Auth;
let clientDb: Firestore;

function ensure() {
  if (!clientApp) {
    clientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
    clientAuth = getAuth(clientApp);
    clientDb = getFirestore(clientApp);
  }
}

export function getClientAuth(): Auth {
  ensure();
  return clientAuth;
}

export function getClientDb(): Firestore {
  ensure();
  return clientDb;
}
