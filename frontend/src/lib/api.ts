// Cliente HTTP da API. O cookie de sessão é HttpOnly e enviado automaticamente (mesmo domínio).

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? safeJson(text) : undefined;
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "mensagem" in data ? String((data as { mensagem: unknown }).mensagem) : null)
      ?? (res.status === 502 || res.status === 504 ? "A API não está respondendo. Verifique se o back-end está em execução." : `Erro ${res.status}`);
    if (res.status === 401 && typeof window !== "undefined" && !url.includes("/auth/")) {
      window.dispatchEvent(new CustomEvent("conecta:nao-autenticado"));
    }
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

function safeJson(t: string): unknown {
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body: unknown) => request<T>("PATCH", url, body),
};
