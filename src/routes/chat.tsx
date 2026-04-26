import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageCircle, LogOut, Search, Loader2, UserPlus, Settings, User as UserIcon, Bell, Shield, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { StatusBar } from "@/components/status/StatusBar";
import { StatusComposer } from "@/components/status/StatusComposer";
import { StatusViewer } from "@/components/status/StatusViewer";

export type Contact = {
  uid: string;
  displayName: string;
  phone: string;
};

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [contactsLoading, setContactsLoading] = useState(true);

  // Add contact dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("+91");
  const [adding, setAdding] = useState(false);

  // Status state
  const [statusComposerOpen, setStatusComposerOpen] = useState(false);
  const [statusViewUid, setStatusViewUid] = useState<string | null>(null);

  // Settings dialogs
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  // Realtime subscription to user's contacts subcollection
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, "users", user.uid, "contacts");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list: Contact[] = snap.docs.map((d) => ({
          uid: d.id,
          displayName: (d.data().displayName as string) ?? "साथी",
          phone: (d.data().phone as string) ?? "",
        }));
        list.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setContacts(list);
        setContactsLoading(false);
      },
      () => setContactsLoading(false),
    );
    return () => unsub();
  }, [user]);

  const handleAddContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const phone = newPhone.trim();
    if (!/^\+\d{10,15}$/.test(phone)) {
      toast.error("Phone country code के साथ दें (जैसे +9198XXXXXXXX)");
      return;
    }
    if (phone === user.phone) {
      toast.error("ये तो आपका ही number है");
      return;
    }
    setAdding(true);
    try {
      const q = query(collection(db, "users"), where("phone", "==", phone));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error("इस number पर कोई user नहीं मिला");
        return;
      }
      const peer = snap.docs[0];
      const peerData = peer.data();
      await setDoc(doc(db, "users", user.uid, "contacts", peer.id), {
        uid: peer.id,
        displayName: peerData.displayName ?? "साथी",
        phone: peerData.phone,
        addedAt: serverTimestamp(),
      });
      toast.success(`${peerData.displayName} जुड़ गए ✨`);
      setNewPhone("+91");
      setDialogOpen(false);
    } catch (err) {
      console.error("Add contact failed:", err);
      const msg = (err as { code?: string; message?: string })?.code
        ?? (err as { message?: string })?.message
        ?? "Add नहीं हो पाया";
      toast.error(`Add नहीं हो पाया: ${msg}`);
    } finally {
      setAdding(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = contacts.filter(
    (p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search),
  );

  const inChatDetail = location.pathname.startsWith("/chat/");

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <aside
        className={`${
          inChatDetail ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 flex-col border-r border-border bg-card`}
      >
        <header
          className="px-4 py-4 border-b border-border flex items-center justify-between"
          style={{ background: "var(--gradient-warm)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-card/20 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-primary-foreground font-bold text-base leading-tight">
                माँ से बात
              </h1>
              <p className="text-primary-foreground/80 text-xs truncate max-w-[180px]">
                {user.displayName} · {user.phone}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="text-primary-foreground hover:bg-card/20"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </header>

        <div className="px-3 py-3 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="खोजें..."
              className="pl-9 bg-muted border-0"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" aria-label="Add contact" className="shrink-0">
                <UserPlus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>नया contact जोड़ें</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPhone">Phone number</Label>
                  <Input
                    id="newPhone"
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+9198XXXXXXXX"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    दूसरे user का registered number डालें
                  </p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={adding} className="w-full">
                    {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    जोड़ें
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status strip */}
        <StatusBar
          contacts={contacts}
          onAddStatus={() => setStatusComposerOpen(true)}
          onOpenUser={(uid) => setStatusViewUid(uid)}
        />

        <div className="flex-1 overflow-y-auto">
          {contactsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              {contacts.length === 0
                ? "अभी कोई contact नहीं। ऊपर ➕ से phone number से जोड़ें।"
                : "कोई match नहीं मिला"}
            </div>
          ) : (
            <ul>
              {filtered.map((p) => (
                <li key={p.uid}>
                  <Link
                    to="/chat/$peerId"
                    params={{ peerId: p.uid }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/50"
                    activeProps={{ className: "bg-accent/40" }}
                  >
                    <Avatar className="w-11 h-11">
                      <AvatarFallback
                        className="text-primary-foreground font-semibold"
                        style={{ background: "var(--gradient-warm)" }}
                      >
                        {p.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{p.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.phone}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className={`${inChatDetail ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        <Outlet />
      </section>

      <StatusComposer open={statusComposerOpen} onOpenChange={setStatusComposerOpen} />
      <StatusViewer uid={statusViewUid} onClose={() => setStatusViewUid(null)} />
    </div>
  );
}
