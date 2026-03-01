import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

const DB_NAME = 'instadetox_outbox_v1';
const STORE_NAME = 'mutations';

export interface OutboxMutation {
  id: string; // Client Side UUID for Idempotency
  userId: string;
  type: 'message' | 'post' | 'upload';
  payload: any;
  createdAt: string;
  status: 'pending' | 'retrying' | 'failed';
  retryCount: number;
  lastError?: string;
}

interface OutboxSchema extends DBSchema {
  mutations: {
    key: string;
    value: OutboxMutation;
    indexes: { 'by_created_at': string; 'by_status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<OutboxSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<OutboxSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<OutboxSchema>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('mutations')) {
          const store = db.createObjectStore('mutations', { keyPath: 'id' });
          store.createIndex('by_created_at', 'createdAt');
          store.createIndex('by_status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Agrega una mutación al outbox persistente.
 */
export async function enqueueMutation(mutation: Omit<OutboxMutation, 'status' | 'retryCount'>) {
  const db = await getDB();
  const fullMutation: OutboxMutation = {
    ...mutation,
    status: 'pending',
    retryCount: 0,
  };
  await db.add('mutations', fullMutation);
  return fullMutation;
}

/**
 * Obtiene todas las mutaciones pendientes en orden FIFO.
 */
export async function getPendingMutations(): Promise<OutboxMutation[]> {
  const db = await getDB();
  const index = db.transaction('mutations').store.index('by_created_at');
  const all = await index.getAll();
  return all.filter((m) => m.status !== 'failed');
}

/**
 * Actualiza el estado de una mutación.
 */
export async function updateMutationStatus(id: string, updates: Partial<OutboxMutation>) {
  const db = await getDB();
  const tx = db.transaction('mutations', 'readwrite');
  const store = tx.objectStore('mutations');
  const existing = await store.get(id);
  if (existing) {
    await store.put({ ...existing, ...updates });
  }
  await tx.done;
}

/**
 * Elimina una mutación tras éxito.
 */
export async function dequeueMutation(id: string) {
  const db = await getDB();
  await db.delete('mutations', id);
}

/**
 * Limpieza de mutaciones antiguas o fallidas (Mantenimiento)
 */
export async function clearOldMutations() {
  const db = await getDB();
  const all = await db.getAll('mutations');
  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  
  for (const m of all) {
    if (now - new Date(m.createdAt).getTime() > weekInMs) {
      await db.delete('mutations', m.id);
    }
  }
}
