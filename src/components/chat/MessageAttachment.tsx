import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

type Props = {
  url: string;
  type: "image" | "video" | "audio" | "file";
  name?: string;
  size?: number;
  mine: boolean;
};

export function MessageAttachment({ url, type, name, size, mine }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);

  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <div className="relative max-w-[260px] rounded-xl overflow-hidden bg-black/5">
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center min-h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={url}
            alt={name ?? "attachment"}
            className="max-w-full max-h-72 object-contain"
            onLoad={() => setImgLoaded(true)}
          />
        </div>
      </a>
    );
  }

  if (type === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        className="max-w-[260px] max-h-72 rounded-xl bg-black"
      />
    );
  }

  if (type === "audio") {
    return (
      <audio
        src={url}
        controls
        className="max-w-[260px] h-10"
        preload="metadata"
      />
    );
  }

  // generic file
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={name}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border ${
        mine
          ? "border-bubble-sent-foreground/20 bg-bubble-sent-foreground/5"
          : "border-border bg-muted/40"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{name ?? "File"}</p>
        {typeof size === "number" && (
          <p className="text-[10px] opacity-70">{formatSize(size)}</p>
        )}
      </div>
      <Download className="w-4 h-4 opacity-70 shrink-0" />
    </a>
  );
}

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
