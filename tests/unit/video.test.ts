import { describe, expect, it } from "vitest";
import { toEmbeddableVideoUrl } from "@/lib/video";

describe("toEmbeddableVideoUrl", () => {
  it("converts a standard youtube watch URL", () => {
    const result = toEmbeddableVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result).toEqual({
      kind: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("converts a youtu.be short URL", () => {
    const result = toEmbeddableVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("converts a vimeo URL", () => {
    const result = toEmbeddableVideoUrl("https://vimeo.com/76979871");
    expect(result).toEqual({
      kind: "vimeo",
      embedUrl: "https://player.vimeo.com/video/76979871",
    });
  });

  it("returns null for a non-allowlisted host", () => {
    expect(toEmbeddableVideoUrl("https://evil.example/video.html")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(toEmbeddableVideoUrl("not-a-url")).toBeNull();
  });
});
