/**
 * A small file-backed data store. It keeps users, sessions, carts, orders and
 * stock in one JSON file under .data/, writes atomically, and serialises writes
 * so two requests can't interleave. Swap this layer for Postgres/Prisma when
 * you outgrow it.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { PRODUCTS } from "@/data/products";
import type { CartLine, Order, Session, User } from "@/lib/types";

export interface DB {
  users: User[];
  sessions: Session[];
  carts: Record<string, CartLine[]>;
  orders: Order[];
  stock: Record<string, number>;
}

const DATA_DIR = process.env.RUMM_DATA_DIR || path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function emptyDb(): DB {
  return {
    users: [],
    sessions: [],
    carts: {},
    orders: [],
    stock: Object.fromEntries(PRODUCTS.map((p) => [p.id, p.stock])),
  };
}

async function load(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as DB;
    // new products added to the catalogue get their seed stock
    for (const p of PRODUCTS) if (db.stock[p.id] === undefined) db.stock[p.id] = p.stock;
    return db;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    throw err;
  }
}

async function save(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

let queue: Promise<unknown> = Promise.resolve();

/** Run a read-modify-write transaction. Writes are serialised. */
export function tx<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function read<T>(fn: (db: DB) => T): Promise<T> {
  await queue.catch(() => undefined);
  return fn(await load());
}

export { StoreError } from "@/lib/errors";
import { StoreError } from "@/lib/errors";


export function getStockMap(): Promise<Record<string, number>> {
  return read((db) => ({ ...db.stock }));
}

