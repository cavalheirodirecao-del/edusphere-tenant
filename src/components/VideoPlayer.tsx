import { getVimeoId, getYouTubeId } from "@/lib/auth-helpers";

export function VideoPlayer({ url }: { url: string }) {
  const yt = getYouTubeId(url);
  if (yt) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-elegant">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${yt}`}
          title="Aula"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  const vm = getVimeoId(url);
  if (vm) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-elegant">
        <iframe
          className="h-full w-full"
          src={`https://player.vimeo.com/video/${vm}`}
          title="Aula"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-elegant">
      <video src={url} controls className="h-full w-full" />
    </div>
  );
}