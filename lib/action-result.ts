export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | void> {
  return { ok: true, data: data as T };
}

export function fail<T = never>(error: string): ActionResult<T> {
  return { ok: false, error };
}
