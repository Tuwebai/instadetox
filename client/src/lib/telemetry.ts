/** 
 * InstaDetox Enterprise Telemetry (M12)
 * Instrumentación de métricas de performance (LCP) sin afectar la UX.
 */

export function initPerformanceTelemetry() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  const sentMetrics = new Set<string>();

  try {
    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];

      // Solo enviar el LCP más relevante por navegación
      const metricKey = `LCP:${window.location.pathname}`;
      if (sentMetrics.has(metricKey)) return;

      const lcpValue = lastEntry.startTime;
      const payload = JSON.stringify({
        metric: "LCP",
        value: lcpValue,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
      });

      // Usar beacon para asegurar el envío incluso si se cierra la pestaña
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/metrics/performance", blob);
      } else {
        fetch("/api/metrics/performance", {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {});
      }

      sentMetrics.add(metricKey);
    });

    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) {
    // Silently fail to not affect app stability
  }
}
