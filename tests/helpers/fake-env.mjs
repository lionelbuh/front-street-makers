// In-memory stand-ins for the Cloudflare bindings used by the worker:
// a D1-compatible wrapper around node:sqlite and a Map-backed R2 bucket.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../../worker/schema.sql', import.meta.url), 'utf8'));
  const norm = (row) => (row ? { ...row } : null);
  return {
    raw: db,
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a.map((v) => (v === undefined ? null : v)); return stmt; },
        async first() { return norm(db.prepare(sql).get(...args)); },
        async all() { return { results: db.prepare(sql).all(...args).map(norm) }; },
        async run() { db.prepare(sql).run(...args); return { success: true }; }
      };
      return stmt;
    }
  };
}

export function fakeR2() {
  const store = new Map();
  return {
    store,
    async put(key, value, opts = {}) { store.set(key, { body: value, httpMetadata: opts.httpMetadata || {} }); },
    async get(key) { return store.get(key) || null; },
    async delete(key) { store.delete(key); }
  };
}

export function fakeEnv(extra = {}) {
  return {
    DB: fakeD1(),
    PHOTOS: fakeR2(),
    ADMIN_PASSWORD: 'correct horse battery staple',
    SESSION_SECRET: 'test-secret-0123456789',
    ALLOWED_ORIGINS: 'https://frontstreetmakers.com',
    ...extra
  };
}
