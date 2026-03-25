function randomInt(maxExclusive: number) {
  if (maxExclusive <= 0) return 0;

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

export function shuffleItems<T>(items: T[]): T[] {
  if (items.length <= 1) return [...items];

  const pool = [...items];

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return pool;
}

export function pickRandomItems<T>(items: T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return shuffleItems(items);

  const pool = shuffleItems(items);

  return pool.slice(0, count);
}

export function pickRandomItem<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[randomInt(items.length)] ?? null;
}
