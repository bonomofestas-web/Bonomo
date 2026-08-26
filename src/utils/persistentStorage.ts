import { safeLocalStorageSet } from './mediaStorage';

const KNOWN_VERSIONS = ['v7', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1', ''];

/**
 * Intelligently retrieves data by scanning all known localStorage versions (v7 down to v1 and legacy).
 * For arrays (leads, debutantes, venues, templates, etc.), it merges items across versions by id
 * so that no lead, debutante or template created in an older version is ever discarded.
 */
export function loadPersistedData<T>(entityKey: string, defaultValue: T): T {
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaultValue;
  }

  const isArrayExpected = Array.isArray(defaultValue);

  if (isArrayExpected) {
    const mergedMap = new Map<string, any>();
    let foundAny = false;

    // Scan backwards from legacy to newest so newer versions overwrite older fields with same id
    const versionsAscending = [...KNOWN_VERSIONS].reverse();

    for (const v of versionsAscending) {
      const fullKey = v ? `bonomo_admin_${entityKey}_${v}` : `bonomo_admin_${entityKey}`;
      try {
        const raw = localStorage.getItem(fullKey);
        if (raw && raw !== 'null' && raw !== 'undefined' && raw !== '[]') {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            foundAny = true;
            for (const item of parsed) {
              const itemId = item?.id || JSON.stringify(item);
              const existing = mergedMap.get(itemId) || {};
              mergedMap.set(itemId, { ...existing, ...item });
            }
          }
        }
      } catch {
        // continue scanning
      }
    }

    if (foundAny && mergedMap.size > 0) {
      const result = Array.from(mergedMap.values()) as unknown as T;
      // Auto-promote to current canonical key
      persistData(entityKey, result);
      return result;
    }

    return defaultValue;
  } else {
    // For objects / single values (user, theme, active_venue)
    for (const v of KNOWN_VERSIONS) {
      const fullKey = v ? `bonomo_admin_${entityKey}_${v}` : `bonomo_admin_${entityKey}`;
      try {
        const raw = localStorage.getItem(fullKey);
        if (raw && raw !== 'null' && raw !== 'undefined' && raw !== '{}' && raw !== '""') {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            persistData(entityKey, parsed);
            return parsed as T;
          } else if (typeof parsed !== 'object' && parsed !== null) {
            persistData(entityKey, parsed);
            return parsed as T;
          }
        }
      } catch {
        // continue
      }
    }

    return defaultValue;
  }
}

/**
 * Persists data to both the versioned key and the canonical unversioned key.
 */
export function persistData(entityKey: string, value: any): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);
    safeLocalStorageSet(`bonomo_admin_${entityKey}_v7`, stringified);
    safeLocalStorageSet(`bonomo_admin_${entityKey}`, stringified);
  } catch (e) {
    console.error(`[persistentStorage] Error saving ${entityKey}:`, e);
  }
}

/**
 * Exports all system data as a downloadable JSON backup.
 */
export function exportFullBackup(): string {
  const keys = [
    'venues', 'debutantes', 'leads', 'templates', 
    'benefits_catalog', 'vip_catalog', 'tasks', 
    'collaborators', 'user', 'theme', 'active_venue'
  ];
  const backup: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    system: 'Bonomo Festas 2',
    data: {}
  };

  keys.forEach(k => {
    backup.data[k] = loadPersistedData(k, null);
  });

  return JSON.stringify(backup, null, 2);
}

/**
 * Imports full JSON backup into localStorage.
 */
export function importFullBackup(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    const data = parsed.data || parsed;
    Object.keys(data).forEach(k => {
      persistData(k, data[k]);
    });
    return true;
  } catch (e) {
    console.error('[persistentStorage] Import failed:', e);
    return false;
  }
}
