import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatbotApi, type ChatHistory } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Sparkles, Send, Mic, Loader2 } from "lucide-react";

type Msg = { role: "user" | "ai"; text: string };

const SEED: Msg[] = [
  { role: "ai", text: "Namaste! I'm your MedNow health assistant. Tell me how you're feeling today, and I'll help with triage, medicine guidance, or booking a doctor." },
];

const SUGGESTIONS = [
  "Child has fever for 2 days",
  "Find paracetamol nearby",
  "Diabetes diet tips",
  "Chest pain — is it serious?",
];

export function AIAssistant() {
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const { lang } = useI18n();
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<unknown>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    scrollToBottom();

    try {
      // Build history for Gemini (exclude seed)
      const history: ChatHistory[] = newMessages.slice(1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.text,
      }));

      const res = await chatbotApi.sendMessage(text, history, lang);
      setMessages((prev) => [...prev, { role: "ai", text: res.data.message }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I'm having trouble connecting right now. For emergencies, call 108 or tap the SOS button. Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new (SpeechRecognition as new () => {
      lang: string;
      interimResults: boolean;
      onresult: (e: unknown) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    })();
    recognitionRef.current = recognition;
    recognition.lang = lang === "hi" ? "hi-IN" : lang === "ta" ? "ta-IN" : lang === "te" ? "te-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (e: unknown) => {
      const evt = e as { results: { 0: { transcript: string } }[] };
      const transcript = evt.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  return (
    <section id="assistant" className="bg-primary-soft/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            An AI health assistant that meets you halfway.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Ask in your language, by voice or text. Get triage classification, medicine guidance,
            and a clear next step — in seconds. Powered by Google Gemini.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Triage label="Mild" tone="success" />
            <Triage label="Moderate" tone="warning" />
            <Triage label="Emergency" tone="destructive" />
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <div className={`h-2.5 w-2.5 rounded-full ${loading ? "bg-warning animate-pulse" : "bg-success"}`} />
            <span className="text-sm font-semibold">MedNow Assistant</span>
            <span className="ml-auto text-xs text-muted-foreground">Gemini · 4 languages</span>
          </div>

          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="mt-3 flex items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`shrink-0 rounded-xl ${listening ? "border-primary text-primary" : ""}`}
              aria-label="Voice input"
              onClick={startVoice}
              disabled={loading}
            >
              {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your symptoms…"
              className="rounded-xl"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0 rounded-xl"
              aria-label="Send"
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Triage({ label, tone }: { label: string; tone: "success" | "warning" | "destructive" }) {
  const map = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <div className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold ${map[tone]}`}>
      {label}
    </div>
  );
}
