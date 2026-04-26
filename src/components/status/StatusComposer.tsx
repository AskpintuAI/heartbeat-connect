import { useRef, useState, type FormEvent } from "react";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Image as ImageIcon, Video, X } from "lucide-react";
import { toast } from "sonner";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25MB

const GRADIENTS = [
  "linear-gradient(135deg, oklch(0.68 0.19 45), oklch(0.76 0.17 55))",
  "linear-gradient(135deg, oklch(0.55 0.18 30), oklch(0.78 0.16 65))",
  "linear-gradient(135deg, oklch(0.7 0.2 40), oklch(0.85 0.13 85))",
  "linear-gradient(135deg, oklch(0.45 0.15 25), oklch(0.7 0.18 50))",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StatusComposer({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [bgIndex, setBgIndex] = useState(0);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText("");
    setMedia(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setBgIndex(0);
  };

  const handleFile = (file: File) => {
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error("File 25MB से बड़ी है");
      return;
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("सिर्फ़ image या video चुनें");
      return;
    }
    setMedia(file);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(URL.createObjectURL(file));
  };

  const post = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || posting) return;
    if (!text.trim() && !media) {
      toast.error("कुछ लिखें या media चुनें");
      return;
    }
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: "image" | "video" | null = null;
      if (media) {
        const ext = media.name.split(".").pop() ?? "bin";
        const path = `statuses/${user.uid}/${Date.now()}.${ext}`;
        const r = ref(storage, path);
        await uploadBytes(r, media, { contentType: media.type });
        mediaUrl = await getDownloadURL(r);
        mediaType = media.type.startsWith("video/") ? "video" : "image";
      }
      const now = Date.now();
      await addDoc(collection(db, "statuses"), {
        uid: user.uid,
        displayName: user.displayName,
        text: text.trim().slice(0, 500),
        mediaUrl,
        mediaType,
        bgGradient: media ? null : GRADIENTS[bgIndex],
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + TWELVE_HOURS_MS),
      });
      toast.success("Status लग गया ✨ (12 घंटे में अपने आप हट जाएगा)");
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("Status post failed:", err);
      toast.error("Status post नहीं हो पाया");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>नया Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={post} className="space-y-4">
          {mediaPreview ? (
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              {media?.type.startsWith("video/") ? (
                <video
                  src={mediaPreview}
                  className="w-full max-h-72 object-contain bg-black"
                  controls
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="preview"
                  className="w-full max-h-72 object-contain bg-black"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (mediaPreview) URL.revokeObjectURL(mediaPreview);
                  setMedia(null);
                  setMediaPreview(null);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remove media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl p-6 min-h-32 flex items-center justify-center"
              style={{ background: GRADIENTS[bgIndex] }}
            >
              <p className="text-primary-foreground text-center font-semibold text-lg whitespace-pre-wrap break-words">
                {text || "यहाँ आपका status..."}
              </p>
            </div>
          )}

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="कुछ लिखें..."
            rows={3}
            maxLength={500}
          />

          {!media && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Background:</span>
              {GRADIENTS.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBgIndex(i)}
                  className={`w-7 h-7 rounded-full border-2 ${
                    bgIndex === i ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ background: g }}
                  aria-label={`Background ${i + 1}`}
                />
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-1.5" /> Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video className="w-4 h-4 mr-1.5" /> Video
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">12h बाद auto-delete</span>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={posting} className="w-full">
              {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Status लगाएं
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
