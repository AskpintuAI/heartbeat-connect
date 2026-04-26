import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import type { Contact } from "@/routes/chat";

export type StatusItem = {
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

type Props = {
  contacts: Contact[];
  onAddStatus: () => void;
  onOpenUser: (uid: string) => void;
};

export function StatusBar({ contacts, onAddStatus, onOpenUser }: Props) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<StatusItem[]>([]);

  useEffect(() => {
    if (!user) return;
    // Listen to all non-expired statuses; client filters to self + contacts
    const q = query(
      collection(db, "statuses"),
      where("expiresAt", ">", Timestamp.now()),
      orderBy("expiresAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: StatusItem[] = snap.docs.map((d) => {
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
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  const contactIds = new Set(contacts.map((c) => c.uid));
  // Group by uid (latest first per user). Self separately.
  const myStatuses = statuses.filter((s) => s.uid === user.uid);
  const friendsByUid = new Map<string, StatusItem[]>();
  for (const s of statuses) {
    if (s.uid === user.uid) continue;
    if (!contactIds.has(s.uid)) continue;
    const arr = friendsByUid.get(s.uid) ?? [];
    arr.push(s);
    friendsByUid.set(s.uid, arr);
  }

  const friendList = Array.from(friendsByUid.entries()).map(([uid, items]) => ({
    uid,
    displayName: items[0].displayName,
    latest: items[0],
    count: items.length,
  }));

  return (
    <div className="border-b border-border bg-card/60">
      <div className="px-3 py-3 flex items-center gap-3 overflow-x-auto scrollbar-none">
        {/* My status — always first */}
        <button
          onClick={onAddStatus}
          className="flex flex-col items-center gap-1 shrink-0 group"
          aria-label="Add status"
        >
          <div className="relative">
            <Avatar
              className={`w-14 h-14 ${
                myStatuses.length > 0
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                  : "ring-2 ring-border"
              }`}
            >
              <AvatarFallback
                className="text-primary-foreground font-semibold"
                style={{ background: "var(--gradient-warm)" }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card"
              aria-hidden
            >
              <Plus className="w-3 h-3" strokeWidth={3} />
            </span>
          </div>
          <span className="text-[10px] text-foreground font-medium max-w-[60px] truncate">
            {myStatuses.length > 0 ? "मेरा status" : "Add status"}
          </span>
        </button>

        {myStatuses.length > 0 && (
          <button
            onClick={() => onOpenUser(user.uid)}
            className="hidden"
            aria-hidden
          />
        )}

        {/* Friends with statuses */}
        {friendList.map((f) => (
          <button
            key={f.uid}
            onClick={() => onOpenUser(f.uid)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <Avatar
              className="w-14 h-14 ring-2 ring-primary ring-offset-2 ring-offset-card"
            >
              {f.latest.mediaUrl && f.latest.mediaType === "image" ? (
                <AvatarImage src={f.latest.mediaUrl} alt={f.displayName} />
              ) : null}
              <AvatarFallback
                className="text-primary-foreground font-semibold"
                style={{ background: "var(--gradient-status)" }}
              >
                {f.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-foreground font-medium max-w-[60px] truncate">
              {f.displayName.split(" ")[0]}
            </span>
          </button>
        ))}

        {friendList.length === 0 && myStatuses.length === 0 && (
          <span className="text-xs text-muted-foreground pl-2">
            Status लगाएं — 12 घंटे बाद अपने आप हट जाएगा
          </span>
        )}
      </div>
    </div>
  );
}
