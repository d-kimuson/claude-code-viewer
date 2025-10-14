export class InMemoryCacheStorage<const T> {
  private storage = new Map<string, T>();

  public constructor() {}

  public get(key: string) {
    return this.storage.get(key);
  }

  public save(key: string, value: T) {
    this.storage.set(key, value);
  }

  public invalidate(key: string) {
    if (!this.storage.has(key)) {
      return;
    }

    this.storage.delete(key);
  }
}
