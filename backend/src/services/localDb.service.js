import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.resolve(DATA_DIR, 'local_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[LocalDB] Could not create data directory:', err.message);
  }
}

// In-memory cache
let database = {
  classrooms: [],
  students: [],
  attendance: [],
  lesson_plans: [],
  student_progress: [],
  assignments: [],
  timetables: [],
  teacher_profiles: []
};

// Load existing database if available
if (fs.existsSync(DB_PATH)) {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    database = { ...database, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('[LocalDB] Corrupted local_db.json, reinitializing:', err.message);
  }
}

const persist = () => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[LocalDB] Save failed:', err.message);
  }
};

/**
 * Creates a fluent query builder imitating the Supabase JavaScript API
 */
class LocalQueryBuilder {
  constructor(table) {
    this.table = table;
    if (!database[table]) {
      database[table] = [];
    }
    this.filters = [];
    this.sorts = [];
    this.isSingle = false;
    this.action = 'select'; // 'select' | 'insert' | 'update' | 'delete' | 'upsert'
    this.payload = null;
    this.onConflict = null;
  }

  select(columns = '*') {
    if (this.action === 'select') {
      this.columns = columns;
    }
    return this;
  }

  insert(data) {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(data) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data, options = {}) {
    this.action = 'upsert';
    this.payload = data;
    this.onConflict = options.onConflict || 'id';
    return this;
  }

  eq(field, value) {
    this.filters.push(item => String(item[field]) === String(value));
    return this;
  }

  gte(field, value) {
    this.filters.push(item => item[field] >= value);
    return this;
  }

  lte(field, value) {
    this.filters.push(item => item[field] <= value);
    return this;
  }

  in(field, values) {
    const set = new Set(values.map(String));
    this.filters.push(item => set.has(String(item[field])));
    return this;
  }

  order(field, { ascending = true } = {}) {
    this.sorts.push({ field, ascending });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // Make it thenable so `await query` resolves to { data, error }
  async then(resolve, reject) {
    try {
      const result = this.execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err });
    }
  }

  execute() {
    const list = database[this.table];

    if (this.action === 'insert') {
      const itemsToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = itemsToInsert.map(item => {
        const record = {
          id: item.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item
        };
        list.push(record);
        return record;
      });
      persist();
      const output = this.isSingle ? inserted[0] : (Array.isArray(this.payload) ? inserted : inserted[0]);
      return { data: output, error: null };
    }

    if (this.action === 'upsert') {
      const itemsToUpsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const conflictKeys = this.onConflict ? this.onConflict.split(',').map(s => s.trim()) : ['id'];

      const results = itemsToUpsert.map(item => {
        const existingIndex = list.findIndex(existing => {
          return conflictKeys.every(k => String(existing[k]) === String(item[k]));
        });

        if (existingIndex >= 0) {
          list[existingIndex] = {
            ...list[existingIndex],
            ...item,
            updated_at: new Date().toISOString()
          };
          return list[existingIndex];
        } else {
          const record = {
            id: item.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item
          };
          list.push(record);
          return record;
        }
      });
      persist();
      const output = this.isSingle ? results[0] : (Array.isArray(this.payload) ? results : results[0]);
      return { data: output, error: null };
    }

    if (this.action === 'update') {
      let matched = list.filter(item => this.filters.every(f => f(item)));
      matched.forEach(item => {
        Object.assign(item, this.payload, { updated_at: new Date().toISOString() });
      });
      persist();
      const output = this.isSingle ? matched[0] || null : matched;
      return { data: output, error: null };
    }

    if (this.action === 'delete') {
      const remaining = list.filter(item => !this.filters.every(f => f(item)));
      database[this.table] = remaining;
      persist();
      return { data: null, error: null };
    }

    // Default: 'select'
    let results = list.filter(item => this.filters.every(f => f(item)));

    // Sorting
    for (const sort of this.sorts) {
      results.sort((a, b) => {
        const valA = a[sort.field];
        const valB = b[sort.field];
        if (valA === valB) return 0;
        if (valA == null) return sort.ascending ? -1 : 1;
        if (valB == null) return sort.ascending ? 1 : -1;
        if (valA < valB) return sort.ascending ? -1 : 1;
        return sort.ascending ? 1 : -1;
      });
    }

    const output = this.isSingle ? results[0] || null : results;
    return { data: output, error: null };
  }
}

export const createLocalSupabaseFallback = () => {
  return {
    from: (table) => new LocalQueryBuilder(table),
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'teacher@ruralclass.local',
            user_metadata: {
              full_name: 'Teacher',
              school_name: 'Govt Higher Primary School'
            }
          }
        },
        error: null
      })
    }
  };
};

