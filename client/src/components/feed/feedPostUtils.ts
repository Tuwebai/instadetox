export const compactCount = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value));

export const shortTimeAgo = (isoDate: string) => {
  const now = Date.now();
  const at = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - at);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) return "ahora";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} h`;
  if (diffMs < week) return `${Math.floor(diffMs / day)} d`;
  return `${Math.floor(diffMs / week)} sem`;
};

export const isVideoUrl = (mediaUrl: string | null) => {
  if (!mediaUrl) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(mediaUrl) || mediaUrl.includes(".m3u8");
};

export const parseMediaList = (mediaUrl: string | null): string[] => {
  if (!mediaUrl) return [];
  const raw = mediaUrl.trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (
              item &&
              typeof item === "object" &&
              "url" in item &&
              typeof (item as { url: unknown }).url === "string"
            ) {
              return (item as { url: string }).url.trim();
            }
            return "";
          })
          .filter(Boolean);
      }
    } catch {
      // fallback
    }
  }

  return raw
    .split(/[\n,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
};
