import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const detailsSchema = z.object({
  displayName: z.string().trim().min(1, "नाम ज़रूरी है").max(60, "नाम बहुत लंबा है"),
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{10,15}$/, "फ़ोन number country code के साथ दें (जैसे +9198XXXXXXXX)"),
});

const otpSchema = z.string().regex(/^\d{6}$/, "6-digit code दें");

type FirebaseErrorLike = { code?: string; message?: string };

function getCurrentHost() {
  return typeof window === "undefined" ? "preview domain" : window.location.hostname;
}

function getOtpErrorMessage(error: unknown) {
  const firebaseError = error as FirebaseErrorLike;
  const code = firebaseError?.code ?? "";

  if (code === "auth/network-request-failed") {
    return "Network block ho raha hai. Mobile data/WiFi बदलकर फिर try करें.";
  }

  if (
    code === "auth/invalid-app-credential" ||
    code === "auth/unauthorized-domain" ||
    code === "auth/captcha-check-failed" ||
    (firebaseError?.message ?? "").includes("Hostname match not found")
  ) {
    return `Firebase Authorized domains में exact domain add करें: ${getCurrentHost()}`;
  }

  if (code === "auth/too-many-requests") {
    return "बहुत ज़्यादा OTP requests हो गई हैं. थोड़ी देर बाद try करें.";
  }

  if (code === "auth/invalid-phone-number") {
    return "Phone number country code के साथ सही format में दें.";
  }

  return firebaseError?.message || "OTP भेजने में दिक्कत";
}

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const recaptchaHostRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/chat" });
  }, [user, navigate]);

  const resetRecaptcha = () => {
    try {
      verifierRef.current?.clear();
    } catch {
      /* ignore */
    }
    verifierRef.current = null;
    recaptchaContainerRef.current?.remove();
    recaptchaContainerRef.current = null;
  };

  const createRecaptchaVerifier = () => {
    resetRecaptcha();
    if (!recaptchaHostRef.current) throw new Error("reCAPTCHA mount missing");

    const container = document.createElement("div");
    container.dataset.recaptchaAttempt = String(Date.now());
    recaptchaHostRef.current.appendChild(container);
    recaptchaContainerRef.current = container;

    verifierRef.current = new RecaptchaVerifier(auth, container, {
      size: "invisible",
    });

    return verifierRef.current;
  };

  // Cleanup reCAPTCHA on unmount
  useEffect(() => resetRecaptcha, []);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = detailsSchema.safeParse({ displayName, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      // Save name so we can persist it after OTP verifies
      localStorage.setItem("pendingDisplayName", parsed.data.displayName);

      const verifier = createRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, parsed.data.phone, verifier);
      confirmationRef.current = confirmation;
      setStep("otp");
      toast.success("OTP भेज दिया गया 📱");
    } catch (err) {
      toast.error(getOtpErrorMessage(err));
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!confirmationRef.current) {
      toast.error("पहले OTP भेजें");
      return;
    }
    setLoading(true);
    try {
      const cred = await confirmationRef.current.confirm(parsed.data);
      // Save user profile in Firestore
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          uid: cred.user.uid,
          displayName: displayName.trim(),
          phone: cred.user.phoneNumber,
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success("स्वागत है! 🌿");
      navigate({ to: "/chat" });
    } catch {
      toast.error("OTP गलत है");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "var(--gradient-soft)" }}
    >
      <Card className="w-full max-w-md p-6 sm:p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--gradient-warm)" }}
          >
            <MessageCircle className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-bold text-lg text-foreground">माँ से बात</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          {step === "details" ? "स्वागत है" : "OTP डालें"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {step === "details"
            ? "अपना नाम और phone number दें"
            : `${phone} पर भेजा गया 6-digit code`}
        </p>

        {step === "details" ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">आपका नाम</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="जैसे: रिया शर्मा"
                required
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+9198XXXXXXXX"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              OTP भेजें
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp">6-digit OTP</Label>
              <Input
                id="otp"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify करें
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setStep("details");
                setOtp("");
                confirmationRef.current = null;
              }}
              disabled={loading}
            >
              Number बदलें
            </Button>
          </form>
        )}

        {/* Invisible reCAPTCHA mount point */}
        <div ref={recaptchaHostRef} />
      </Card>
    </main>
  );
}
