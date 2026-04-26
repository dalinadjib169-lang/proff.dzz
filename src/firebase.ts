import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import the Firebase configuration from the root JSON file
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with settings optimized for the AI Studio environment
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, (firebaseConfig as any).firestoreDatabaseId || "(default)");

// Tracking connection status
export let isFirestoreConnected = false;
const connectionListeners: ((connected: boolean) => void)[] = [];

export const onConnectionChange = (callback: (connected: boolean) => void) => {
  connectionListeners.push(callback);
  callback(isFirestoreConnected);
};

const notifyListeners = (status: boolean) => {
  isFirestoreConnected = status;
  connectionListeners.forEach(cb => cb(status));
};

export const storage = getStorage(app);

// Test connection to Firestore as per guidelines with retry logic
async function testConnection(retries = 5) {
  try {
    const testPromise = getDocFromServer(doc(db, '_connection_test_', 'test'));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
    
    await Promise.race([testPromise, timeoutPromise]);
    console.log("Firestore connection test successful");
    notifyListeners(true);
  } catch (error: any) {
    notifyListeners(false);
    if (retries > 0) {
      console.warn(`Firestore connectivity issue, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return testConnection(retries - 1);
    }
    
    if (error.message === "Timeout" || (error.code === 'unavailable') || (error.message && error.message.includes('the client is offline'))) {
      console.warn("Firestore is currently unreachable. The app will continue in offline mode.");
    } else {
      console.error("Firestore connection test failure:", error);
    }
  }
}

testConnection();

export default app;
