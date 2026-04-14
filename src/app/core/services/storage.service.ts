import { Injectable } from '@angular/core';

const PREFIX = 'svb_';

/**
 * Thin localStorage wrapper.
 * All keys are namespaced with "svb_" so they don't clash with other apps.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {

  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('[StorageService] Could not write to localStorage:', e);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  }

  /** Wipe all Summit Valley Bank keys (used by the admin "Reset DB" action). */
  clearAll(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }

  has(key: string): boolean {
    return localStorage.getItem(PREFIX + key) !== null;
  }
}
