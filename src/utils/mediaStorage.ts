// IndexedDB Large Media Storage for Videos and High-Res Images
// Avoids localStorage 5MB quota limit crashes

const DB_NAME = 'BonomoMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'mediaFiles';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[MediaStorage] Failed to open IndexedDB:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

// In-memory cache for fast blob URLs
const blobUrlCache = new Map<string, string>();

/**
 * Saves a File / Blob to IndexedDB and returns an identifier key like `idb://video_12345`
 */
export async function saveMediaFile(file: File | Blob, prefix = 'media'): Promise<string> {
  try {
    const db = await getDB();
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const key = `idb://${id}`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, key);

      req.onsuccess = () => {
        // Create an immediate ObjectURL cache
        const objectUrl = URL.createObjectURL(file);
        blobUrlCache.set(key, objectUrl);
        resolve(key);
      };

      req.onerror = () => {
        console.error('[MediaStorage] Error storing media:', req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn('[MediaStorage] IndexedDB fallback to ObjectURL:', err);
    // Fallback: create temporary object URL
    const tempUrl = URL.createObjectURL(file);
    return tempUrl;
  }
}

/**
 * Resolves a media key (e.g. `idb://media_123` or regular `https://...`) into a playable/renderable URL
 */
export async function resolveMediaUrl(uri?: string): Promise<string> {
  if (!uri) return '';
  
  // If it's already a standard URL (http, https, blob, data), return directly
  if (!uri.startsWith('idb://')) {
    return uri;
  }

  // Check cache first
  if (blobUrlCache.has(uri)) {
    return blobUrlCache.get(uri)!;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(uri);

      req.onsuccess = () => {
        const fileOrBlob = req.result;
        if (fileOrBlob instanceof Blob) {
          const objectUrl = URL.createObjectURL(fileOrBlob);
          blobUrlCache.set(uri, objectUrl);
          resolve(objectUrl);
        } else {
          resolve('');
        }
      };

      req.onerror = () => {
        console.error('[MediaStorage] Error loading media for', uri, req.error);
        resolve('');
      };
    });
  } catch (err) {
    console.error('[MediaStorage] Could not resolve IndexedDB media:', err);
    return '';
  }
}

/**
 * Safely saves to localStorage without throwing QuotaExceededError crashes
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] localStorage quota exceeded or error for key "${key}". Preventing app crash:`, err);
    return false;
  }
}
