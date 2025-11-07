export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value);
}

export function toPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function badRequest(message: string) {
  const err = new Error(message) as Error & { status?: number };
  err.status = 400;
  return err;
}

export function isValidObjectId(value: unknown): value is string {
  // Lightweight check for 24-hex string; actual ObjectId validation occurs on use.
  return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}
