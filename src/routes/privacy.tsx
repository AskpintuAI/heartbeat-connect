import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — माँ से बात" },
      {
        name: "description",
        content:
          "माँ से बात की Privacy Policy — हम आपका डेटा कैसे collect, use और protect करते हैं।",
      },
      { property: "og:title", content: "Privacy Policy — माँ से बात" },
      {
        property: "og:description",
        content: "माँ से बात app की Privacy Policy।",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <article className="max-w-2xl mx-auto text-foreground">
        <Link
          to="/"
          className="text-sm text-primary hover:underline"
        >
          ← Home
        </Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: 10 May 2026
        </p>

        <Section title="1. Introduction">
          <p>
            "माँ से बात" ("we", "our", "app") आपकी privacy का सम्मान करता है।
            यह Privacy Policy बताती है कि हम आपकी जानकारी कैसे collect, use,
            और protect करते हैं।
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Phone number:</strong> OTP-based authentication के लिए।
            </li>
            <li>
              <strong>Profile info:</strong> नाम और profile picture (optional)।
            </li>
            <li>
              <strong>Messages & media:</strong> आपके chats, voice messages,
              images और status updates — securely stored।
            </li>
            <li>
              <strong>Device info:</strong> basic device और usage logs जो
              service चलाने के लिए ज़रूरी हैं।
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-6 space-y-2">
            <li>Account बनाने और authenticate करने के लिए।</li>
            <li>Real-time messaging deliver करने के लिए।</li>
            <li>App को secure और spam-free रखने के लिए।</li>
            <li>Service improve करने और bugs fix करने के लिए।</li>
          </ul>
        </Section>

        <Section title="4. Data Sharing">
          <p>
            हम आपका personal data किसी third party को बेचते नहीं हैं। Data
            केवल trusted infrastructure providers (जैसे Firebase / Lovable
            Cloud) के साथ share होता है जो service चलाने में मदद करते हैं।
          </p>
        </Section>

        <Section title="5. Data Security">
          <p>
            हम industry-standard security measures use करते हैं ताकि आपका
            data safe रहे। फिर भी कोई internet transmission 100% secure नहीं
            होता।
          </p>
        </Section>

        <Section title="6. Your Rights">
          <ul className="list-disc pl-6 space-y-2">
            <li>आप अपना account और data कभी भी delete कर सकते हैं।</li>
            <li>Profile information edit कर सकते हैं।</li>
            <li>Permissions (camera, mic, storage) revoke कर सकते हैं।</li>
          </ul>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            यह app 13 साल से कम उम्र के बच्चों के लिए नहीं है। हम जानबूझकर
            उनसे data collect नहीं करते।
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            समय-समय पर हम इस policy को update कर सकते हैं। बदलाव इसी पेज पर
            publish किए जाएंगे।
          </p>
        </Section>

        <Section title="9. Contact Us">
          <p>
            कोई सवाल हो तो email करें:{" "}
            <a
              href="mailto:pkpeeyush1@gmail.com"
              className="text-primary hover:underline"
            >
              pkpeeyush1@gmail.com
            </a>
          </p>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
        {children}
      </div>
    </section>
  );
}
