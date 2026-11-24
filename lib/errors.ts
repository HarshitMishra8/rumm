/** An error with a message that is safe to show to the customer. */
export class StoreError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** MongoDB's error code for a duplicate value in a unique index. */
export function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
