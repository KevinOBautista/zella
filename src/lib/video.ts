/**
 * Only YouTube and Vimeo URLs are ever turned into an <iframe> embed.
 * Everything else must render as a plain external link (rel="noopener
 * noreferrer"): never render arbitrary third-party iframe
 * HTML from a seller-supplied URL.
 */
export type EmbeddableVideo = { kind: "youtube" | "vimeo"; embedUrl: string };

export function toEmbeddableVideoUrl(url: string): EmbeddableVideo | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = parsed.searchParams.get("v");
    if (id) return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shortsMatch) {
      return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}` };
    }
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (id) return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
    return null;
  }

  if (host === "vimeo.com") {
    const match = parsed.pathname.match(/^\/(\d+)/);
    if (match) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${match[1]}` };
    return null;
  }

  return null;
}
