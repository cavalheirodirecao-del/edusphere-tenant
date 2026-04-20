import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Gauge } from "lucide-react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

interface Props {
  url: string;
  onTimeUpdate?: (currentSeconds: number, duration: number) => void;
  onEnded?: () => void;
  initialSeconds?: number;
}

export function VideoPlayer({ url, onTimeUpdate, onEnded, initialSeconds }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState(false);
  const lastReport = useRef(0);

  useEffect(() => {
    setError(false);
    const v = ref.current;
    if (!v) return;
    const onLoaded = () => {
      if (initialSeconds && initialSeconds > 0 && initialSeconds < (v.duration || Infinity) - 5) {
        v.currentTime = initialSeconds;
      }
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = speed;
  }, [speed]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black shadow-elegant">
        {error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-destructive">Não foi possível carregar o vídeo</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Verifique se a URL é um link direto para um arquivo .mp4/.webm e se o servidor permite CORS (Access-Control-Allow-Origin).
            </p>
            <p className="mt-2 break-all rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">{url}</p>
          </div>
        ) : (
          <video
            ref={ref}
            src={url}
            className="h-full w-full"
            controls
            controlsList="nodownload noplaybackrate noremoteplayback"
            disablePictureInPicture
            onContextMenu={(e) => e.preventDefault()}
            onError={() => setError(true)}
            onEnded={onEnded}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              const now = Math.floor(v.currentTime);
              if (onTimeUpdate && now - lastReport.current >= 10) {
                lastReport.current = now;
                onTimeUpdate(now, v.duration || 0);
              }
            }}
          />
        )}
      </div>
      {!error && (
        <div className="flex items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="glow" size="sm">
                <Gauge className="h-4 w-4" />
                Velocidade · {speed}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SPEEDS.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onSelect={() => setSpeed(s)}
                  className={s === speed ? "text-primary" : ""}
                >
                  {s}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}