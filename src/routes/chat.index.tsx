import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/chat/")({
  component: ChatEmpty,
});

function ChatEmpty() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center text-center px-6"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-soft)" }}
      >
        <MessageCircle className="w-10 h-10 text-primary-foreground" fill="currentColor" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">अपनों से बात शुरू करें</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Left side से किसी को चुनें और real-time में बात-चीत शुरू करें।
      </p>
    </div>
  );
}
