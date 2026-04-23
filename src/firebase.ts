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
// experimentalForceLongPolling is crucial for bypassing proxy/websocket issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, (firebaseConfig as any).firestoreDatabaseId || "(default)");

export const storage = getStorage(app);

// Test connection to Firestore as per guidelines with retry logic
async function testConnection(retries = 3) {
  try {
    // Attempt to get a non-existent document from server to test connectivity
    // Using a timeout to prevent long hangs
    const testPromise = getDocFromServer(doc(db, '_connection_test_', 'test'));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000));
    
    await Promise.race([testPromise, timeoutPromise]);
    console.log("Firestore connection test successful");
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`Firestore connection test failed, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return testConnection(retries - 1);
    }
    
    // If it's just a timeout or "offline", we don't necessarily want to crash the app
    // Firestore SDK will handle the reconnection automatically.
    if (error.message === "Timeout" || (error.code === 'unavailable') || (error.message && error.message.includes('the client is offline'))) {
      console.warn("Firestore is currently unreachable. The app will continue in offline mode.");
    } else {
      console.error("Firestore connection test critical failure:", error);
    }
  }
}

testConnection();

export default app;
