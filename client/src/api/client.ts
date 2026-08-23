export class ApiError extends Error {
  status: number;
  detaylar?: unknown;
  constructor(status: number, message: string, detaylar?: unknown) {
    super(message);
    this.status = status;
    this.detaylar = detaylar;
  }
}

async function istek<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const gövde = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, gövde?.error ?? `İstek başarısız (${res.status})`, gövde?.detaylar);
  }
  return gövde as T;
}

export const api = {
  get: <T>(path: string) => istek<T>(path),
  post: <T>(path: string, body?: unknown) => istek<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) => istek<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) => istek<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => istek<T>(path, { method: "DELETE" }),
};
