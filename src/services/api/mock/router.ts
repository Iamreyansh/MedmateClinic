/**
 * The local mock.
 *
 * It answers the same paths the Java API answers, with the same shapes, so a
 * screen can be built and reviewed before the service exists — and so the
 * switch to the real API is one flag (`VITE_USE_MOCK=false`), not a rewrite.
 */

type Handler = (body: unknown) => unknown;

const routes: Record<string, Handler> = {};

export const mock = {
  on: (method: string, path: string, handler: Handler) => {
    routes[`${method} ${path}`] = handler;
  },
  handle: async (method: string, path: string, body: unknown): Promise<unknown> => {
    const handler = routes[`${method} ${path}`];
    if (!handler) throw new Error(`no mock for ${method} ${path}`);
    return handler(body);
  },
  has: (method: string, path: string) => Boolean(routes[`${method} ${path}`]),
};
