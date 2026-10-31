import { openDB } from 'idb';

const DB_NAME = 'ruralclass_offline_db';
const DB_VERSION = 2;

export const initOfflineDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Classrooms store
      if (!db.objectStoreNames.contains('classrooms')) {
        db.createObjectStore('classrooms', { keyPath: 'id' });
      }
      // 2. Students store
      if (!db.objectStoreNames.contains('students')) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('by_classroom', 'classroom_id');
        studentStore.createIndex('by_grade', 'grade');
      }
      // 3. Attendance Records store
      if (!db.objectStoreNames.contains('attendance_records')) {
        const attStore = db.createObjectStore('attendance_records', { keyPath: 'id' });
        attStore.createIndex('by_classroom', 'classroom_id');
        attStore.createIndex('by_student', 'student_id');
        attStore.createIndex('by_date', 'date');
      }
      // 4. Student Progress store
      if (!db.objectStoreNames.contains('student_progress')) {
        const progressStore = db.createObjectStore('student_progress', { keyPath: 'id' });
        progressStore.createIndex('by_student', 'student_id');
        progressStore.createIndex('by_classroom', 'classroom_id');
      }
      // 5. Lesson Plans store
      if (!db.objectStoreNames.contains('lesson_plans')) {
        const lessonStore = db.createObjectStore('lesson_plans', { keyPath: 'id' });
        lessonStore.createIndex('by_classroom', 'classroom_id');
      }
      // 6. Assignments store
      if (!db.objectStoreNames.contains('assignments')) {
        const assignStore = db.createObjectStore('assignments', { keyPath: 'id' });
        assignStore.createIndex('by_classroom', 'classroom_id');
      }
      // 7. Timetable Blocks store
      if (!db.objectStoreNames.contains('timetable_blocks')) {
        const timetableStore = db.createObjectStore('timetable_blocks', { keyPath: 'id' });
        timetableStore.createIndex('by_classroom_day', ['classroom_id', 'day_of_week']);
      }
      // 8. Offline Mutation Sync Queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
    }
  });
};

export const saveToIndexedDB = async (storeName, data) => {
  try {
    const db = await initOfflineDB();
    if (Array.isArray(data)) {
      const tx = db.transaction(storeName, 'readwrite');
      for (const item of data) {
        await tx.store.put(item);
      }
      await tx.done;
    } else if (data) {
      await db.put(storeName, data);
    }
  } catch (err) {
    console.warn(`[IndexedDB] Error saving to ${storeName}:`, err);
  }
};

export const getAllFromIndexedDB = async (storeName) => {
  try {
    const db = await initOfflineDB();
    return await db.getAll(storeName);
  } catch (err) {
    console.warn(`[IndexedDB] Error reading from ${storeName}:`, err);
    return [];
  }
};

export const getFromIndexedDB = async (storeName, id) => {
  try {
    const db = await initOfflineDB();
    return await db.get(storeName, id);
  } catch (err) {
    console.warn(`[IndexedDB] Error reading key ${id} from ${storeName}:`, err);
    return null;
  }
};

export const deleteFromIndexedDB = async (storeName, id) => {
  try {
    const db = await initOfflineDB();
    await db.delete(storeName, id);
  } catch (err) {
    console.warn(`[IndexedDB] Error deleting ${id} from ${storeName}:`, err);
  }
};

/**
 * Queue an operation locally when offline
 */
export const queueOfflineMutation = async ({ operation, table_name, record_id, payload }) => {
  try {
    const db = await initOfflineDB();
    const queueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      operation,
      table_name,
      record_id: String(record_id),
      payload,
      created_at: new Date().toISOString()
    };
    await db.put('sync_queue', queueItem);
    console.log(`[IndexedDB Queue] Queued ${operation} on ${table_name}:`, queueItem.id);
    return queueItem;
  } catch (err) {
    console.error('[IndexedDB Queue] Failed to queue offline mutation:', err);
  }
};

export const getPendingSyncQueue = async () => {
  try {
    const db = await initOfflineDB();
    return await db.getAll('sync_queue');
  } catch (err) {
    return [];
  }
};

export const removeSyncQueueItem = async (id) => {
  try {
    const db = await initOfflineDB();
    await db.delete('sync_queue', id);
  } catch (err) {
    console.error('[IndexedDB Queue] Failed to remove item:', err);
  }
};

/**
 * Clear all offline data from IndexedDB stores (used when a new teacher registers or signs out)
 */
export const clearAllOfflineData = async () => {
  try {
    const db = await initOfflineDB();
    const storeNames = [
      'classrooms',
      'students',
      'attendance_records',
      'student_progress',
      'lesson_plans',
      'assignments',
      'timetable_blocks',
      'sync_queue'
    ];
    for (const name of storeNames) {
      if (db.objectStoreNames.contains(name)) {
        await db.clear(name);
      }
    }
    console.log('[IndexedDB] Successfully cleared all offline stores for new user session.');
  } catch (err) {
    console.warn('[IndexedDB] Error clearing offline stores:', err);
  }
};

