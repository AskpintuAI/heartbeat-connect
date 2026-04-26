import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { MessageCircle, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/chat" });
    }
  }, [user, loading, navigate]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="relative z-10 text-center max-w-md">
        <div
          className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-soft)" }}
        >
          <MessageCircle className="w-10 h-10 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-3 tracking-tight">
          माँ से बात
        </h1>
        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
          अपनों से जुड़े रहें, हर पल। Real-time chat — सीधे, साफ़ और safe।
        </p>

        <div className="grid grid-cols-3 gap-3 mb-10 text-xs">
          <Feature icon={<Zap className="w-5 h-5" />} label="Real-time" />
          <Feature icon={<Lock className="w-5 h-5" />} label="OTP login" />
          <Feature icon={<MessageCircle className="w-5 h-5" />} label="Simple" />
        </div>

        <Button asChild size="lg" className="w-full" style={{ boxShadow: "var(--shadow-soft)" }}>
          <Link to="/auth">शुरू करें</Link>
        </Button>
      </div>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card/70 backdrop-blur-sm border border-border">
      <span className="text-primary">{icon}</span>
      <span className="text-foreground font-medium">{label}</span>
    </div>
  );
}
