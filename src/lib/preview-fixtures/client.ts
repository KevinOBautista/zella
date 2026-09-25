import { PREVIEW_READ_ONLY_MESSAGE } from "@/config/runtime";
import type { FixtureData, FixtureRow } from "./types";

/**
 * A read-only stand-in for the Supabase client used in fixture mode. It
 * implements the subset of the PostgREST query builder the public pages use,
 * over in-memory rows. There is no session, and every write, RPC, storage or
 * auth call throws — nothing in a preview can reach a real backend.
 */

export class PreviewReadOnlyError extends Error {
  constructor() {
    super(PREVIEW_READ_ONLY_MESSAGE);
    this.name = "PreviewReadOnlyError";
  }
}

type Order = { column: string; ascending: boolean; nullsFirst: boolean };
type Result = { data: unknown; error: null; count: number | null; status: number; statusText: string };

function compare(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b));
}

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

class FixtureQuery implements PromiseLike<Result> {
  private filters: ((row: FixtureRow) => boolean)[] = [];
  private orders: Order[] = [];
  private columns: string[] | null = null;
  private countMode = false;
  private head = false;
  private window: { from: number; to: number } | null = null;

  constructor(private readonly rows: FixtureRow[]) {}

  select(columns = "*", options: { count?: "exact" | "planned" | "estimated"; head?: boolean } = {}) {
    const trimmed = columns.trim();
    this.columns = trimmed === "*" ? null : trimmed.split(",").map((c) => c.trim()).filter(Boolean);
    this.countMode = Boolean(options.count);
    this.head = Boolean(options.head);
    return this;
  }

  private where(test: (row: FixtureRow) => boolean) {
    this.filters.push(test);
    return this;
  }

  eq(column: string, value: unknown) {
    return this.where((r) => r[column] === value);
  }
  neq(column: string, value: unknown) {
    return this.where((r) => r[column] !== value);
  }
  in(column: string, values: readonly unknown[]) {
    return this.where((r) => values.includes(r[column]));
  }
  gt(column: string, value: unknown) {
    return this.where((r) => r[column] != null && compare(r[column], value) > 0);
  }
  gte(column: string, value: unknown) {
    return this.where((r) => r[column] != null && compare(r[column], value) >= 0);
  }
  lt(column: string, value: unknown) {
    return this.where((r) => r[column] != null && compare(r[column], value) < 0);
  }
  lte(column: string, value: unknown) {
    return this.where((r) => r[column] != null && compare(r[column], value) <= 0);
  }
  ilike(column: string, pattern: string) {
    const re = likeToRegExp(pattern);
    return this.where((r) => typeof r[column] === "string" && re.test(r[column] as string));
  }
  or(expression: string) {
    const tests = expression.split(",").map((part) => {
      const [column, op, ...rest] = part.split(".");
      const value = rest.join(".");
      if (op === "ilike") {
        const re = likeToRegExp(value);
        return (r: FixtureRow) => typeof r[column!] === "string" && re.test(r[column!] as string);
      }
      if (op === "eq") return (r: FixtureRow) => String(r[column!]) === value;
      throw new Error(`fixture client: unsupported or() operator "${op}"`);
    });
    return this.where((r) => tests.some((t) => t(r)));
  }
  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    const ascending = options.ascending ?? true;
    this.orders.push({ column, ascending, nullsFirst: options.nullsFirst ?? !ascending });
    return this;
  }
  range(from: number, to: number) {
    this.window = { from, to };
    return this;
  }
  limit(n: number) {
    this.window = { from: this.window?.from ?? 0, to: (this.window?.from ?? 0) + n - 1 };
    return this;
  }

  insert(..._args: unknown[]): never {
    throw new PreviewReadOnlyError();
  }
  update(..._args: unknown[]): never {
    throw new PreviewReadOnlyError();
  }
  upsert(..._args: unknown[]): never {
    throw new PreviewReadOnlyError();
  }
  delete(..._args: unknown[]): never {
    throw new PreviewReadOnlyError();
  }

  private run(): { rows: FixtureRow[]; count: number } {
    let rows = this.rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.orders.length) {
      rows = [...rows].sort((a, b) => {
        for (const o of this.orders) {
          const av = a[o.column];
          const bv = b[o.column];
          if (av == null && bv == null) continue;
          if (av == null) return o.nullsFirst ? -1 : 1;
          if (bv == null) return o.nullsFirst ? 1 : -1;
          const c = compare(av, bv);
          if (c !== 0) return o.ascending ? c : -c;
        }
        return 0;
      });
    }
    const count = rows.length;
    if (this.window) rows = rows.slice(this.window.from, this.window.to + 1);
    const columns = this.columns;
    if (columns) rows = rows.map((r) => Object.fromEntries(columns.map((c) => [c, r[c] ?? null])));
    return { rows, count };
  }

  private result(data: unknown, count: number): Result {
    return { data, error: null, count: this.countMode ? count : null, status: 200, statusText: "OK" };
  }

  async maybeSingle(): Promise<Result> {
    const { rows, count } = this.run();
    return this.result(rows[0] ?? null, count);
  }

  async single(): Promise<Result> {
    const { rows, count } = this.run();
    if (rows.length !== 1) throw new Error("fixture client: expected exactly one row");
    return this.result(rows[0], count);
  }

  then<T1 = Result, T2 = never>(onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null, onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null): PromiseLike<T1 | T2> {
    const { rows, count } = this.run();
    return Promise.resolve(this.result(this.head ? null : rows, count)).then(onfulfilled, onrejected);
  }
}

export function createFixtureClient(data: FixtureData) {
  const refuse = (..._args: unknown[]): never => {
    throw new PreviewReadOnlyError();
  };
  const refuseAsync = async (..._args: unknown[]): Promise<never> => refuse();
  const auth = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: refuseAsync,
    signUp: refuseAsync,
    signOut: refuseAsync,
    resetPasswordForEmail: refuseAsync,
    updateUser: refuseAsync,
    resend: refuseAsync,
    verifyOtp: refuseAsync,
    exchangeCodeForSession: refuseAsync,
  };
  return {
    // Tables that are not part of the fixture set (saves, follows,
    // notifications, private base tables) simply read as empty.
    from: (table: string) => new FixtureQuery(data.tables[table] ?? []),
    rpc: refuse,
    storage: { from: refuse },
    auth,
  };
}
