type LogLevel = "info" | "warn" | "error";

export function log(message: string, level: LogLevel = "info", source = "server", requestId?: string) {
  const timestamp = new Date().toISOString();
  
  // Sanitización y truncado de seguridad (Regla Enterprise)
  // No logueamos más de 500 caracteres para evitar inundación y proteger posibles fugas de buffers/tokens
  const safeMessage = message.length > 500 
    ? message.slice(0, 497) + "..." 
    : message;

  const logEntry = {
    timestamp,
    level,
    source,
    requestId: requestId || undefined,
    message: safeMessage
  };

  // En desarrollo mantenemos una salida legible por humanos con colores
  // En producción (NODE_ENV=production) emitiríamos el JSON puro
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(logEntry));
  } else {
    const colorPrefix = 
      level === "error" ? "\x1b[31m[ERROR]\x1b[0m" : 
      level === "warn"  ? "\x1b[33m[WARN]\x1b[0m"  : 
                          "\x1b[34m[INFO]\x1b[0m";
    
    const reqPart = requestId ? ` [Req:${requestId}]` : "";
    console.log(`${timestamp} ${colorPrefix}${reqPart} [${source}] ${safeMessage}`);
  }
}
