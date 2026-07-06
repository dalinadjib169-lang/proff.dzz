import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  getDocFromCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import the Firebase configuration from the root JSON file
import firebaseConfig from "../firebase-applet-config.json";

// Suppress benign Firestore offline warning
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Could not reach Cloud Firestore backend')) {
    return; // Ignore this specific benign warning
  }
  originalConsoleError.apply(console, args);
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with settings optimized for the AI Studio environment
const databaseId = (firebaseConfig as any).firestoreDatabaseId || "(default)";

// Robust check to avoid IndexedDB / persistent storage failure inside sandboxed iframes
let localCacheSetting;
try {
  // Try accessing window storage and indexedDB. If blocked, this will throw an error.
  if (typeof window !== "undefined" && window.indexedDB && window.localStorage) {
    localCacheSetting = persistentLocalCache({ tabManager: persistentMultipleTabManager() });
  } else {
    localCacheSetting = memoryLocalCache();
  }
} catch (e) {
  console.warn("Firebase: Persistent storage is restricted in this browser context (iframe/sandbox). Falling back to memoryLocalCache.", e);
  localCacheSetting = memoryLocalCache();
}

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: localCacheSetting
}, databaseId);

export const checkFirestoreConnection = async () => {
  try {
    // Try a simple server-side fetch to warm up connection
    const testDoc = doc(db, "_health", "connection");
    await getDocFromServer(testDoc).catch(() => null);
    return true;
  } catch (e) {
    return false;
  }
};

console.log("Firebase initialized with DB ID:", databaseId);

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
