import { vi } from "vitest";

export type Call = { table: string; method: string; args: unknown[] };

/**
 * A chainable stand-in for the supabase-js query builder. Every chained call
 * is recorded; awaiting (or .single/.maybeSingle) resolves to the result
 * returned by `resolve(table, calls)`.
 */
export function fakeSupabase(resolve: (table: string, calls: Call[]) => { data: unknown; error: unknown } = () => ({ data: null, error: null })) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    const own: Call[] = [];
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === "then") {
            const result = resolve(table, own);
            return (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled);
          }
          if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve(resolve(table, own));
          return (...args: unknown[]) => {
            const call = { table, method: prop, args };
            own.push(call);
            calls.push(call);
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const client = {
    from: vi.fn((table: string) => builder(table)),
    rpc: vi.fn(async () => ({ data: true, error: null })),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      admin: { getUserById: vi.fn(async () => ({ data: { user: { email: "seller@example.test" } } })) },
    },
  };
  return { client, calls };
}
