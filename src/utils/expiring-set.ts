export class ExpiringSet<T> {
  private store = new Map<T, number>(); // value -> expiresAt (ms)
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    private sweepEveryMs = 30_000, // how often to GC
    private onExpire?: (value: T) => void // optional callback
  ) {
    this.start();
  }

  add(value: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(value, expiresAt);
  }

  has(value: T): boolean {
    const exp = this.store.get(value);
    if (exp === undefined) return false;
    if (exp > Date.now()) return true;
    // expired → cleanup
    this.store.delete(value);
    this.onExpire?.(value);
    return false;
  }

  delete(value: T): boolean {
    return this.store.delete(value);
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  stop(): void {
    if (this.sweeper) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
  }

  private start() {
    this.sweeper = setInterval(() => {
      const now = Date.now();
      for (const [value, exp] of this.store) {
        if (exp <= now) {
          this.store.delete(value);
          this.onExpire?.(value);
        }
      }
    }, this.sweepEveryMs);
    // Don’t keep the event loop alive just because of GC timer
    (this.sweeper as any).unref?.();
  }
}
