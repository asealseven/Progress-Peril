// Object pool. Enemies, projectiles and effects reuse slots (GDD 9.15).

export interface Poolable {
  active: boolean;
  readonly slot: number;
}

export class Pool<T extends Poolable> {
  /** Every item created so far. Check `active` before use. */
  readonly items: T[] = [];
  activeCount = 0;
  private readonly free: number[] = [];

  constructor(
    private readonly create: (slot: number) => T,
    readonly capacity: number,
  ) {}

  /** Returns an inactive item, or undefined when the pool is full. */
  acquire(): T | undefined {
    let item: T | undefined;
    const slot = this.free.pop();
    if (slot !== undefined) {
      item = this.items[slot];
    } else if (this.items.length < this.capacity) {
      item = this.create(this.items.length);
      this.items.push(item);
    }
    if (!item) return undefined;
    item.active = true;
    this.activeCount++;
    return item;
  }

  release(item: T): void {
    if (!item.active) return;
    item.active = false;
    this.activeCount--;
    this.free.push(item.slot);
  }
}
