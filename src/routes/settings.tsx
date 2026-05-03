import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User as UserIcon,
  Shield,
  UserX,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<"profile" | "privacy" | "delete">("profile");
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) setEditName(user.displayName);
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSaveProfile = async () => {
    const name = editName.trim();
    if (!name) {
      toast.error("नाम खाली नहीं हो सकता");
      return;
    }
    setSavingName(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { displayName: name });
      if (typeof window !== "undefined") {
        localStorage.setItem("pendingDisplayName", name);
      }
      await refreshProfile();
      toast.success("Profile update हो गया ✨");
    } catch (err) {
      console.error(err);
      toast.error("Update नहीं हो पाया");
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      try {
        await deleteDoc(doc(db, "users", user.uid));
      } catch {
        /* ignore */
      }
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      toast.success("Account delete हो गया");
      setConfirmDeleteOpen(false);
      navigate({ to: "/" });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        toast.error("Security के लिए दोबारा login करें, फिर try करें", {
          duration: 6000,
        });
        await signOut();
        navigate({ to: "/auth" });
      } else {
        toast.error("Delete नहीं हो पाया");
      }
    } finally {
      setDeleting(false);
    }
  };

  const sections = [
    { id: "profile" as const, label: "Profile", icon: UserIcon },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "delete" as const, label: "Account delete", icon: UserX, danger: true },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="px-4 py-4 flex items-center gap-3 border-b border-border"
        style={{ background: "var(--gradient-warm)" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-card/20"
          onClick={() => navigate({ to: "/chat" })}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-primary-foreground font-bold text-lg leading-tight">
            Settings
          </h1>
          <p className="text-primary-foreground/80 text-xs">
            अपना account manage करें
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-4xl w-full mx-auto">
        {/* Section list */}
        <nav className="md:w-64 border-b md:border-b-0 md:border-r border-border bg-card">
          <ul className="flex md:flex-col overflow-x-auto md:overflow-visible">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <li key={s.id} className="flex-1 md:flex-none">
                  <button
                    onClick={() => setSection(s.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors whitespace-nowrap ${
                      active
                        ? "bg-accent/40 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60"
                    } ${s.danger ? "text-destructive hover:text-destructive" : ""}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6">
          {section === "profile" && (
            <section className="space-y-5 max-w-md">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Customer profile
                </h2>
                <p className="text-sm text-muted-foreground">
                  आपका नाम और जानकारी
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarFallback
                    className="text-primary-foreground font-semibold text-xl"
                    style={{ background: "var(--gradient-warm)" }}
                  >
                    {user.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {user.displayName}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editName">आपका नाम</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="आपका नाम"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input value={user.phone} disabled />
                <p className="text-xs text-muted-foreground">
                  Phone number बदला नहीं जा सकता
                </p>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={savingName}
                className="w-full"
              >
                {savingName ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save करें
              </Button>
            </section>
          )}

          {section === "privacy" && (
            <section className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Privacy & Security
                </h2>
                <p className="text-sm text-muted-foreground">
                  आपका data कैसे safe है
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/60 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    🔒 आपका data safe है
                  </p>
                  <p className="text-sm text-muted-foreground">
                    सिर्फ़ आपके contacts आपको देख और message कर सकते हैं।
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/60 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    📱 Phone OTP login
                  </p>
                  <p className="text-sm text-muted-foreground">
                    कोई password नहीं — हर बार secure OTP से verify।
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/60 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    🚫 Block / Unblock
                  </p>
                  <p className="text-sm text-muted-foreground">
                    किसी भी contact को कभी भी block कर सकते हैं।
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/60 border border-border">
                  <p className="font-medium text-foreground mb-1">
                    🗑️ Status auto-delete
                  </p>
                  <p className="text-sm text-muted-foreground">
                    आपकी status 12 घंटे में अपने आप हट जाती है।
                  </p>
                </div>
              </div>
            </section>
          )}

          {section === "delete" && (
            <section className="space-y-4 max-w-lg">
              <div>
                <h2 className="text-lg font-semibold text-destructive">
                  Account delete करें
                </h2>
                <p className="text-sm text-muted-foreground">
                  ये action वापस नहीं हो सकता
                </p>
              </div>

              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                <p className="text-sm text-foreground font-medium">
                  Delete करने पर:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>आपकी profile हमेशा के लिए हट जाएगी</li>
                  <li>आपके contacts से आप हट जाएँगे</li>
                  <li>पुराने messages access नहीं होंगे</li>
                  <li>दोबारा login करने पर नया account बनेगा</li>
                </ul>
              </div>

              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Account delete करें
              </Button>
            </section>
          )}
        </main>
      </div>

      <footer className="px-4 py-5 border-t border-border bg-card text-center space-y-1">
        <p className="text-sm font-medium text-foreground">माँ से बात</p>
        <p className="text-xs text-muted-foreground">App version: 1.0.0</p>
        <p className="text-xs text-muted-foreground">
          Designed by <span className="font-semibold text-foreground">AskPintuAI</span>
        </p>
      </footer>

      {/* Confirm delete */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              पक्का delete करना है?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            आपका account हमेशा के लिए हट जाएगा। ये वापस नहीं आएगा।
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deleting}
            >
              रहने दें
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <UserX className="w-4 h-4 mr-2" />
              हाँ, delete करें
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
