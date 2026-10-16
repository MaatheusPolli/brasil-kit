export type MaybePromise<T> = T | Promise<T>;

/** Interface para cache plugável (memória, localStorage, Redis...). */
export interface CacheAdapter {
  get<T>(key: string): MaybePromise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): MaybePromise<void>;
  delete?(key: string): MaybePromise<void>;
  clear?(): MaybePromise<void>;
}
