export class ApiError extends Error {
  status: number;
  detaylar?: unknown;
  constructor(status: number, message: string, detaylar?: unknown) {
    super(message);
    this.status = status;
    this.detaylar = detaylar;
  }
}

// Render'ın ücretsiz planında sunucu bir süre kullanılmadığında uykuya geçer, ilk istek 30-50
// saniye sürebilir - bu yüzden zaman aşımı süresi buna göre cömert tutuldu. Sınır olmazsa bağlantı
// koptuğunda/sunucu hiç yanıt vermediğinde istek sonsuza kadar bekler, ekranda hiç hata
// görünmeden döngüde kalan bir yükleniyor simgesi bırakır.
const ISTEK_ZAMAN_ASIMI_MS = 45_000;

async function istek<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const zamanAsimi = setTimeout(() => controller.abort(), ISTEK_ZAMAN_ASIMI_MS);

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, "Sunucuya ulaşılamıyor (zaman aşımı). Sunucu uykudan uyanıyor olabilir, birkaç saniye sonra tekrar deneyin.");
    }
    throw new ApiError(0, "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.");
  } finally {
    clearTimeout(zamanAsimi);
  }

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
