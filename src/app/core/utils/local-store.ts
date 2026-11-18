export function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function stored<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function persist(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}
