import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type StatusDoc = {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  bgGradient: string | null;
  createdAt: Timestamp | null;
  expiresAt: Timestamp | null;
};

type Comment = {
  id: string;
  uid: string;
  displayName: string;
  text: string;
  createdAt: Timestamp | null;
};

type Props = {
  uid: string | null;
  onClose: () => void;
};

export function StatusViewer({ uid, onClose }: Props) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [idx, setIdx] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<number | null>(null);

  // Load statuses for the target user
  useEffect(() => {
    if (!uid) {
      setStatuses([]);
      setIdx(0);
      return;
    }
    const q = query(
      collection(db, "statuses"),
      where("uid", "==", uid),
      where("expiresAt", ">", Timestamp.now()),
      orderBy("expiresAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: StatusDoc[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid as string,
          displayName: (data.displayName as string) ?? "साथी",
          text: (data.text as string) ?? "",
          mediaUrl: (data.mediaUrl as string) ?? null,
          mediaType: (data.mediaType as "image" | "video" | null) ?? null,
          bgGradient: (data.bgGradient as string) ?? null,
          createdAt: (data.createdAt as Timestamp | null) ?? null,
          expiresAt: (data.expiresAt as Timestamp | null) ?? null,
        };
      });
      setStatuses(list);
      setIdx((i) => Math.min(i, Math.max(0, list.length - 1)));
    });
    return () => unsub();
  }, [uid]);

  const current = statuses[idx];

  // Comments listener
  useEffect(() => {
    if (!current) {
      setComments([]);
      return;
    }
    const q = query(
      collection(db, "statuses", current.id, "comments"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: data.uid as string,
            displayName: (data.displayName as string) ?? "साथी",
            text: (data.text as string) ?? "",
            createdAt: (data.createdAt as Timestamp | null) ?? null,
          };
        }),
      );
    });
    return () => unsub();
  }, [current]);

  // Auto-progress for non-video statuses (5s per status)
  useEffect(() => {
    if (!current || current.mediaType === "video") {
      setProgress(0);
      return;
    }
    setProgress(0);
    const start = Date.now();
    const DURATION = 5000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (idx < statuses.length - 1) setIdx(idx + 1);
        else onClose();
        return;
      }
      progressRef.current = requestAnimationFrame(tick);
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => {
      if (progressRef.current !== null) cancelAnimationFrame(progressRef.current);
    };
  }, [current, idx, statuses.length, onClose]);

  const sendComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !current || sending) return;
    const t = commentText.trim();
    if (!t) return;
    setSending(true);
    try {
      await addDoc(collection(db, "statuses", current.id, "comments"), {
        uid: user.uid,
        displayName: user.displayName,
        text: t.slice(0, 500),
        createdAt: serverTimestamp(),
      });
      setCommentText("");
    } catch {
      toast.error("Comment नहीं भेजा जा सका");
    } finally {
      setSending(false);
    }
  };

  const deleteStatus = async () => {
    if (!current || !user || current.uid !== user.uid) return;
    if (!confirm("Status delete करें?")) return;
    try {
      await deleteDoc(doc(db, "statuses", current.id));
      toast.success("Status हटा दिया");
    } catch {
      toast.error("Delete fail हुआ");
    }
  };

  const open = !!uid;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden bg-background border-0 sm:rounded-3xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Status viewer</DialogTitle>
        {!current ? (
          <div className="aspect-[9/14] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-20 px-2 pt-2 flex gap-1">
              {statuses.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white"
                    style={{
                      width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 z-20 px-4 flex items-center gap-2 pt-2">
              <Avatar className="w-9 h-9 ring-2 ring-white/40">
                <AvatarFallback
                  className="text-primary-foreground font-semibold text-sm"
                  style={{ background: "var(--gradient-warm)" }}
                >
                  {current.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-white drop-shadow">
                <p className="font-semibold text-sm truncate">{current.displayName}</p>
                <p className="text-[10px] opacity-80">
                  {current.createdAt
                    ? timeAgo(current.createdAt.toDate())
                    : "अभी"}
                </p>
              </div>
              {current.uid === user?.uid && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 w-9 h-9"
                  onClick={deleteStatus}
                  aria-label="Delete status"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Media / text body */}
            <div
              className="relative aspect-[9/14] flex items-center justify-center overflow-hidden"
              style={{
                background: current.bgGradient ?? "var(--gradient-warm)",
              }}
            >
              {/* Tap zones */}
              <button
                onClick={() => idx > 0 && setIdx(idx - 1)}
                className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                aria-label="Previous"
              >
                {idx > 0 && (
                  <ChevronLeft className="w-6 h-6 text-white/60 absolute left-2 top-1/2 -translate-y-1/2" />
                )}
              </button>
              <button
                onClick={() => {
                  if (idx < statuses.length - 1) setIdx(idx + 1);
                  else onClose();
                }}
                className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                aria-label="Next"
              >
                {idx < statuses.length - 1 && (
                  <ChevronRight className="w-6 h-6 text-white/60 absolute right-2 top-1/2 -translate-y-1/2" />
                )}
              </button>

              {current.mediaUrl ? (
                current.mediaType === "video" ? (
                  <video
                    key={current.id}
                    src={current.mediaUrl}
                    className="w-full h-full object-contain bg-black"
                    autoPlay
                    playsInline
                    controls
                    onEnded={() => {
                      if (idx < statuses.length - 1) setIdx(idx + 1);
                      else onClose();
                    }}
                  />
                ) : (
                  <img
                    src={current.mediaUrl}
                    alt={current.text || "status"}
                    className="w-full h-full object-contain"
                  />
                )
              ) : null}

              {current.text && (
                <div
                  className={`absolute ${
                    current.mediaUrl ? "bottom-20 left-4 right-4" : "inset-4 flex items-center justify-center"
                  } z-[5] pointer-events-none`}
                >
                  <p className="text-white text-center font-semibold text-xl whitespace-pre-wrap break-words drop-shadow-lg">
                    {current.text}
                  </p>
                </div>
              )}
            </div>

            {/* Comments + input */}
            <div className="bg-card border-t border-border max-h-64 flex flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    पहला comment करें 💬
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-2 items-start">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback
                          className="text-primary-foreground text-xs font-semibold"
                          style={{ background: "var(--gradient-status)" }}
                        >
                          {c.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          {c.displayName}
                        </p>
                        <p className="text-sm text-foreground break-words">
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form
                onSubmit={sendComment}
                className="p-2 border-t border-border flex items-center gap-2"
              >
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Comment लिखें..."
                  maxLength={500}
                  className="flex-1 bg-muted border-0 rounded-full px-4 h-9 text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentText.trim() || sending}
                  className="rounded-full w-9 h-9 shrink-0"
                  aria-label="Send comment"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "अभी";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} मिनट पहले`;
  const h = Math.floor(m / 60);
  return `${h} घंटे पहले`;
}
