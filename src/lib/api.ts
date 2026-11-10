// 백엔드(API)와 이야기하는 곳이에요. 규칙(권한, 승인, 당일 적용 불가 등)은 모두 백엔드가 지키고,
// 화면은 결과를 보여 주기만 해요. 로그인 정보(토큰)만 이 브라우저에 보관해요.
export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const KEY = "moa_token";

export const tokenStore = {
  get: (): string => (typeof window === "undefined" ? "" : window.localStorage.getItem(KEY) ?? ""),
  set: (t: string) => window.localStorage.setItem(KEY, t),
  clear: () => window.localStorage.removeItem(KEY),
};

export class ApiError extends Error {
  status: number;
  errors?: string[];
  constructor(message: string, status: number, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function messageOf(data: unknown, status: number): string {
  const d = data as { message?: string | string[] } | null;
  if (d?.message) return Array.isArray(d.message) ? d.message.join(" ") : d.message;
  if (status === 0) return "서버에 연결할 수 없어요. 백엔드가 켜져 있는지 확인해 주세요.";
  if (status === 403) return "이 기능을 쓸 수 있는 권한이 없어요.";
  return "문제가 생겼어요. 잠시 뒤에 다시 해 주세요.";
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: opts.method ?? "GET",
      headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(messageOf(null, 0), 0);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && !path.startsWith("/auth/")) {
    tokenStore.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("로그인이 필요해요.", 401);
  }
  if (!res.ok) throw new ApiError(messageOf(data, res.status), res.status, (data as { errors?: string[] } | null)?.errors);
  return data as T;
}

/** 파일 내려받기 (PDF, 양식 샘플 등). 로그인 정보가 필요해서 fetch 로 받아서 저장해요. */
export async function download(path: string, fallbackName: string): Promise<string> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(API + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(messageOf(null, 0), 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(messageOf(data, res.status), res.status);
  }
  const cd = res.headers.get("content-disposition") ?? "";
  const m = cd.match(/filename\*=UTF-8''([^;]+)/);
  const name = m ? decodeURIComponent(m[1]) : fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return name;
}
