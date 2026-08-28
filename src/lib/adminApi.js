const API_ROOT = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export async function adminRequest(path, options = {}) {
  return fetch(`${API_ROOT}/api/admin${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Request": "1",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });
}
