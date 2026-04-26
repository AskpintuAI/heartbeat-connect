import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { db, chatRoomId } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp | null;
};

type PeerProfile = {
  uid: string;
  displayName: string;
  phone: string;
};

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
          text: data.text as string,
          createdAt: (data.createdAt as Timestamp | null) ?? null,
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

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user || sending) return;
    if (trimmed.length > 2000) {
      toast.error("Message बहुत लंबा है");
      return;
    }
    setSending(true);
    setText("");
    try {
      const roomId = chatRoomId(user.uid, peerId);
      // Make sure room doc exists with participants for security rules / listing
      await setDoc(
        doc(db, "chats", roomId),
        {
          participants: [user.uid, peerId].sort(),
          updatedAt: serverTimestamp(),
          lastMessage: trimmed,
        },
        { merge: true },
      );
      await addDoc(collection(db, "chats", roomId, "messages"), {
        senderId: user.uid,
        text: trimmed,
        createdAt: serverTimestamp(),
      });
    } catch {
      toast.error("Message नहीं भेजा जा सका");
      setText(trimmed);
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
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-2"}`}
              >
                <div
                  className={`max-w-[78%] px-3 py-1.5 text-sm leading-relaxed break-words ${
                    mine
                      ? "bg-bubble-sent text-bubble-sent-foreground rounded-2xl rounded-br-sm"
                      : "bg-bubble-received text-bubble-received-foreground rounded-2xl rounded-bl-sm"
                  }`}
                  style={{ boxShadow: "var(--shadow-bubble)" }}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block text-[10px] mt-0.5 text-right ${
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

      <form
        onSubmit={sendMessage}
        className="p-3 border-t border-border bg-card flex items-center gap-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="अपना message लिखें..."
          maxLength={2000}
          className="flex-1 bg-muted border-0 rounded-full px-4"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending}
          className="rounded-full w-10 h-10 shrink-0"
          style={{ background: "var(--gradient-warm)" }}
          aria-label="Send"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
