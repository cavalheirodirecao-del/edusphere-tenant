export const SLUG_RE = /^[a-z0-9-]{2,40}$/;
export const USERNAME_RE = /^[a-z0-9_.-]{2,40}$/;

export function buildSyntheticEmail(slug: string, username: string) {
  return `${username.toLowerCase()}@${slug.toLowerCase()}.ead.local`;
}

export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export function getVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}