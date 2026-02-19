import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const parsePackedFirebaseEnv = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

  if (typeof apiKey !== 'string' || !apiKey.includes('\\nVITE_FIREBASE_')) {
    return {};
  }

  return apiKey
    .split('\\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('VITE_FIREBASE_') && entry.includes('='))
    .reduce((acc, entry) => {
      const [key, ...valueParts] = entry.split('=');
      acc[key] = valueParts.join('=');
      return acc;
    }, {});
};

const packedEnv = parsePackedFirebaseEnv();

const env = {
  apiKey: packedEnv.VITE_FIREBASE_API_KEY ?? import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: packedEnv.VITE_FIREBASE_AUTH_DOMAIN ?? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: packedEnv.VITE_FIREBASE_PROJECT_ID ?? import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: packedEnv.VITE_FIREBASE_STORAGE_BUCKET ?? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    packedEnv.VITE_FIREBASE_MESSAGING_SENDER_ID ?? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: packedEnv.VITE_FIREBASE_APP_ID ?? import.meta.env.VITE_FIREBASE_APP_ID
};

const missingVars = Object.entries(env)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    `[Firebase] Faltan variables: ${missingVars.join(', ')}. Revisá tu .env y asegurate de tener una variable por línea.`
  );
}

const firebaseConfig = {
  apiKey: env.apiKey,
  authDomain: env.authDomain,
  projectId: env.projectId,
  storageBucket: env.storageBucket,
  messagingSenderId: env.messagingSenderId,
  appId: env.appId
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
