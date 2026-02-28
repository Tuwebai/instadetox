import { supabase } from "./supabase";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("No active session found");
  }

  // 2. Construir los headers y preservar los existentes
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // 3. Opciones finales
  const finalOptions: RequestInit = {
    ...options,
    headers,
  };

  // 4. Hacer fetch (asumiendo backend en el mismo origen en prod, ruta relativa /api/)
  const response = await fetch(endpoint, finalOptions);

  if (!response.ok) {
    let errorMsg = `API Error ${response.status}`;
    try {
      const errPayload = await response.json();
      errorMsg = errPayload.error || errPayload.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // 5. Parsear si hay JSON (no lanzar error si es body vacío)
  try {
    return await response.json();
  } catch {
    return null;
  }
}
