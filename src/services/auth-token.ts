/* Where the demo session lives. "Keep me signed in" → localStorage (shared by all tabs);
 * otherwise sessionStorage, so two tabs can be signed in as different demo accounts
 * (e.g. guest and host) while sharing the same demo dataset. */
const KEY = "nuzul.session";

function safe<T>(fn: () => T, fallback: T): T { try { return fn(); } catch { return fallback; } }

export const sessionStore = {
  getItem: (name: string) => safe(() => sessionStorage.getItem(name) ?? localStorage.getItem(name), null),
  setItem: (name: string, value: string) => safe(() => {
    const keep = (JSON.parse(value) as { state?: { keep?: boolean } }).state?.keep;
    sessionStorage.setItem(name, value);
    if (keep) localStorage.setItem(name, value); else localStorage.removeItem(name);
  }, undefined),
  removeItem: (name: string) => safe(() => { sessionStorage.removeItem(name); localStorage.removeItem(name); }, undefined),
};

let token: string | null = null;
export const getToken = () => token;
export const setToken = (t: string | null) => { token = t; };
export const SESSION_KEY = KEY;
