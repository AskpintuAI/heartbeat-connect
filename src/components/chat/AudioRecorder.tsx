import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  onSend: (blob: Blob, durationSec: number) => Promise<void> | void;
  disabled?: boolean;
};

export function AudioRecorder({ onSend, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const start = async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setAudioUrl(url);
        cleanup();
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s >= 60) {
            // auto-stop at 60s
            try {
              recRef.current?.stop();
            } catch {
              /* ignore */
            }
            setRecording(false);
            return 60;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Mic access नहीं मिला");
    }
  };

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setRecording(false);
  };

  const cancel = () => {
    if (recording) stop();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setBlob(null);
    setAudioUrl(null);
    setSeconds(0);
  };

  const send = async () => {
    if (!blob) return;
    setSending(true);
    try {
      await onSend(blob, seconds);
      cancel();
    } catch {
      toast.error("Audio send नहीं हो पाया");
    } finally {
      setSending(false);
    }
  };

  if (blob && audioUrl) {
    return (
      <div className="flex items-center gap-2 flex-1 bg-muted rounded-full px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancel}
          className="rounded-full w-8 h-8 shrink-0"
          aria-label="Cancel recording"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
        <audio src={audioUrl} controls className="flex-1 h-8 min-w-0" />
        <Button
          type="button"
          size="icon"
          onClick={send}
          disabled={sending}
          className="rounded-full w-9 h-9 shrink-0"
          aria-label="Send audio"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-full px-3 py-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm text-destructive font-medium">
          Recording... {formatTime(seconds)}
        </span>
        <Button
          type="button"
          size="icon"
          onClick={stop}
          variant="destructive"
          className="rounded-full w-9 h-9 shrink-0 ml-auto"
          aria-label="Stop recording"
        >
          <Square className="w-4 h-4" fill="currentColor" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={start}
      disabled={disabled}
      className="rounded-full w-10 h-10 shrink-0 text-muted-foreground hover:text-primary"
      aria-label="Record audio"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
