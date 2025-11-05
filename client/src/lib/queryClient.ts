import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Special handling for trial-ended (402) to allow UI to show upgrade modal
  if (res.status === 402) {
    // try to extract JSON body, fallback to text
    let payload: any = null;
    try {
      payload = await res.clone().json();
    } catch (e) {
      try {
        payload = { message: await res.clone().text() };
      } catch {
        payload = { message: "Trial ended" };
      }
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("trial-ended", { detail: payload }));
    }

    // Throw an error so callers can still handle it if needed
    const text = payload && payload.message ? payload.message : `Trial ended (402)`;
    const err: any = new Error(`402: ${text}`);
    err.status = 402;
    err.payload = payload;
    throw err;
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build a safe URL from queryKey without forcing string conversion on objects
    const qk = queryKey as unknown as any[];
    let url: string;

    if (Array.isArray(qk)) {
      const [base, params] = qk as [unknown, unknown];
      if (typeof base === "string") {
        url = base;
        if (params && typeof params === "object") {
          const usp = new URLSearchParams();
          for (const [k, v] of Object.entries(params as Record<string, any>)) {
            if (v === undefined || v === null) continue;
            if (Array.isArray(v)) {
              v.forEach((item) => usp.append(k, String(item)));
            } else if (typeof v === "object") {
              usp.append(k, JSON.stringify(v));
            } else {
              usp.append(k, String(v));
            }
          }
          const qs = usp.toString();
          if (qs) url += (url.includes("?") ? "&" : "?") + qs;
        }
      } else {
        url = String(base);
      }
    } else {
      url = String(qk as unknown as any);
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
