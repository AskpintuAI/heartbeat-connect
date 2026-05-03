import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, chatRoomId } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MessageAttachment } from "@/components/chat/MessageAttachment";
import { AudioRecorder } from "@/components/chat/AudioRecorder";

type AttachmentType = "image" | "video" | "audio" | "file";

type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
  attachmentUrl?: string | null;
  attachmentType?: AttachmentType | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
};

type PeerProfile = {
  uid: string;
  displayName: string;
  phone: string;
};

const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024; // 50MB

export const Route = createFileRoute("/chat/$peerId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { peerId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [peer, setPeer] = useState<PeerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Attachment state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<AttachmentType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load peer profile
  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", peerId));
        if (!active) return;
        if (!snap.exists()) {
          toast.error("User नहीं मिला");
          navigate({ to: "/chat" });
          return;
        }
        const d = snap.data();
        setPeer({
          uid: peerId,
          displayName: (d.displayName as string) ?? "साथी",
          phone: (d.phone as string) ?? "",
        });
      } catch {
        toast.error("Profile load नहीं हुआ");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, peerId, navigate]);

  // Realtime subscription to messages
  useEffect(() => {
    if (!user) return;
    const roomId = chatRoomId(user.uid, peerId);
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId as string,
          text: (data.text as string) ?? "",
          createdAt: (data.createdAt as Timestamp | null) ?? null,
          attachmentUrl: (data.attachmentUrl as string | null) ?? null,
          attachmentType: (data.attachmentType as AttachmentType | null) ?? null,
          attachmentName: (data.attachmentName as string | null) ?? null,
          attachmentSize: (data.attachmentSize as number | null) ?? null,
        };
      });
      setMessages(list);
    });
    return () => unsub();
  }, [user, peerId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const clearPending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setPendingType(null);
  };

  const choosePending = (file: File, hint: AttachmentType) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("File 50MB से बड़ी है");
      return;
    }
    let type: AttachmentType = hint;
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";
    else type = "file";

    setPendingFile(file);
    setPendingType(type);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    if (type === "image" || type === "video") {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview(null);
    }
    setAttachMenuOpen(false);
  };

  const ensureRoom = async () => {
    if (!user) return;
    const roomId = chatRoomId(user.uid, peerId);
    await setDoc(
      doc(db, "chats", roomId),
      {
        participants: [user.uid, peerId].sort(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return roomId;
  };

  const uploadAttachment = async (
    file: Blob,
    type: AttachmentType,
    nameHint: string,
  ): Promise<{ url: string; name: string; size: number }> => {
    if (!user) throw new Error("not authed");
    const roomId = chatRoomId(user.uid, peerId);
    const ext = nameHint.includes(".") ? nameHint.split(".").pop() : "bin";
    const safeName = nameHint.replace(/[^\w.\-]/g, "_").slice(0, 80);
    const path = `chats/${roomId}/${user.uid}/${Date.now()}_${safeName || "file." + ext}`;
    const r = ref(storage, path);
    await uploadBytes(r, file, { contentType: file.type || undefined });
    const url = await getDownloadURL(r);
    return { url, name: safeName || `audio.${ext}`, size: file.size };
  };

  const sendMessage = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !pendingFile) || !user || sending) return;
    if (trimmed.length > 2000) {
      toast.error("Message बहुत लंबा है");
      return;
    }
    setSending(true);
    const draftText = trimmed;
    setText("");

    try {
      const roomId = await ensureRoom();
      if (!roomId) return;

      let attachment: {
        attachmentUrl: string;
        attachmentType: AttachmentType;
        attachmentName: string;
        attachmentSize: number;
      } | null = null;

      if (pendingFile && pendingType) {
        setUploading(true);
        const up = await uploadAttachment(pendingFile, pendingType, pendingFile.name);
        attachment = {
          attachmentUrl: up.url,
          attachmentType: pendingType,
          attachmentName: up.name,
          attachmentSize: up.size,
        };
        setUploading(false);
      }

      await addDoc(collection(db, "chats", roomId, "messages"), {
        senderId: user.uid,
        text: draftText,
        createdAt: serverTimestamp(),
        ...(attachment ?? {}),
      });

      await setDoc(
        doc(db, "chats", roomId),
        {
          updatedAt: serverTimestamp(),
          lastMessage: draftText || (attachment ? `[${attachment.attachmentType}]` : ""),
        },
        { merge: true },
      );

      clearPending();
    } catch (err) {
      console.error(err);
      toast.error("Message नहीं भेजा जा सका");
      setText(draftText);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const sendVoice = async (blob: Blob, durationSec: number) => {
    if (!user) return;
    setSending(true);
    try {
      const roomId = await ensureRoom();
      if (!roomId) return;
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
      const up = await uploadAttachment(file, "audio", file.name);
      await addDoc(collection(db, "chats", roomId, "messages"), {
        senderId: user.uid,
        text: "",
        createdAt: serverTimestamp(),
        attachmentUrl: up.url,
        attachmentType: "audio",
        attachmentName: up.name,
        attachmentSize: up.size,
        attachmentDuration: durationSec,
      });
      await setDoc(
        doc(db, "chats", roomId),
        { updatedAt: serverTimestamp(), lastMessage: "🎙️ Voice message" },
        { merge: true },
      );
    } catch (err) {
      console.error(err);
      toast.error("Voice भेजा नहीं जा सका");
      throw err;
    } finally {
      setSending(false);
    }
  };

  if (loading || !peer || !user) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--chat-bg)" }}>
      <header
        className="px-3 py-3 flex items-center gap-3 border-b border-border"
        style={{ background: "var(--gradient-warm)" }}
      >
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="md:hidden text-primary-foreground hover:bg-card/20"
        >
          <Link to="/chat" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <Avatar className="w-10 h-10 ring-2 ring-card/30">
          <AvatarFallback className="bg-card text-primary font-semibold">
            {peer.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-primary-foreground font-semibold truncate">{peer.displayName}</h2>
          <p className="text-primary-foreground/80 text-xs truncate">{peer.phone}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              अभी कोई message नहीं। पहला hello भेजकर बात शुरू करें 💚
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === user.uid;
            const prev = messages[i - 1];
            const grouped = prev && prev.senderId === m.senderId;
            const time = m.createdAt
              ? m.createdAt.toDate().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            const hasAttachment = !!m.attachmentUrl && !!m.attachmentType;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2"}`}
              >
                <div
                  className={`max-w-[78%] px-2.5 py-1.5 text-sm leading-relaxed break-words ${
                    mine
                      ? "bg-bubble-sent text-bubble-sent-foreground rounded-2xl rounded-br-sm"
                      : "bg-bubble-received text-bubble-received-foreground rounded-2xl rounded-bl-sm"
                  }`}
                  style={{ boxShadow: "var(--shadow-bubble)" }}
                >
                  {hasAttachment && m.attachmentUrl && m.attachmentType && (
                    <div className={m.text ? "mb-1.5" : ""}>
                      <MessageAttachment
                        url={m.attachmentUrl}
                        type={m.attachmentType}
                        name={m.attachmentName ?? undefined}
                        size={m.attachmentSize ?? undefined}
                        mine={mine}
                      />
                    </div>
                  )}
                  {m.text && <p className="whitespace-pre-wrap px-1">{m.text}</p>}
                  <span
                    className={`block text-[10px] mt-0.5 text-right px-1 ${
                      mine ? "text-bubble-sent-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pending attachment preview */}
      {pendingFile && (
        <div className="border-t border-border bg-card px-3 py-2 flex items-center gap-3">
          {pendingPreview && pendingType === "image" && (
            <img
              src={pendingPreview}
              alt="preview"
              className="w-14 h-14 object-cover rounded-lg"
            />
          )}
          {pendingPreview && pendingType === "video" && (
            <video
              src={pendingPreview}
              className="w-14 h-14 object-cover rounded-lg bg-black"
            />
          )}
          {(pendingType === "file" || pendingType === "audio") && (
            <div className="w-14 h-14 rounded-lg bg-primary/15 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pendingFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {pendingType} · {(pendingFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearPending}
            disabled={uploading}
            aria-label="Remove attachment"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="p-2.5 border-t border-border bg-card flex items-center gap-2"
      >
        {/* Attachment menu */}
        <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="rounded-full w-10 h-10 shrink-0 text-muted-foreground hover:text-primary"
              aria-label="Attach"
              disabled={sending}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-44 p-1.5">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted text-sm"
            >
              <ImageIcon className="w-4 h-4 text-primary" /> Photo
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted text-sm"
            >
              <Video className="w-4 h-4 text-primary" /> Video
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted text-sm"
            >
              <FileText className="w-4 h-4 text-primary" /> File
            </button>
          </PopoverContent>
        </Popover>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) choosePending(f, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) choosePending(f, "video");
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) choosePending(f, "file");
            e.target.value = "";
          }}
        />

        {/* Either text input + send, OR voice recorder UI */}
        {text.trim().length === 0 && !pendingFile ? (
          <>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="अपना message लिखें..."
              maxLength={2000}
              className="flex-1 bg-muted border-0 rounded-full px-4"
              autoComplete="off"
              disabled={sending}
            />
            <AudioRecorder onSend={sendVoice} disabled={sending} />
          </>
        ) : (
          <>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={pendingFile ? "Caption (optional)..." : "अपना message लिखें..."}
              maxLength={2000}
              className="flex-1 bg-muted border-0 rounded-full px-4"
              autoComplete="off"
              disabled={sending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={(!text.trim() && !pendingFile) || sending}
              className="rounded-full w-10 h-10 shrink-0"
              style={{ background: "var(--gradient-warm)" }}
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
