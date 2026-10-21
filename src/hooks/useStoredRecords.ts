import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

const STORAGE_KEY = 'spatial-valuation-dashboard.records.v1';

function readRecords<T>(): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as T[];
  } catch {
    return [];
  }
}

export function useStoredRecords<T>(): [T[], Dispatch<SetStateAction<T[]>>] {
  const [records, setRecords] = useState<T[]>(readRecords<T>);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Storage may be unavailable (private mode, quota). The session still
      // works; persistence is a convenience, not a source of valuation data.
    }
  }, [records]);

  return [records, setRecords];
}

export const RECORDS_STORAGE_KEY = STORAGE_KEY;
