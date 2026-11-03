const TOKEN_KEY = "bulkmail_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event("auth-expired"));
  }
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.data = data;
    throw err;
  }
  return data;
}

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const sendMail = (payload) =>
  request("/mail/send", { method: "POST", body: JSON.stringify(payload) });

export const fetchHistory = (page = 1, limit = 10) =>
  request(`/mail/history?page=${page}&limit=${limit}`);

export const deleteRecord = (id) => request(`/mail/${id}`, { method: "DELETE" });
