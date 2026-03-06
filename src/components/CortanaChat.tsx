import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import cortanaGif from "@/assets/cortana.gif";
import { Send, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[*_#`~>\[\](){}|]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function speakText(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const cleanText = cleanTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "es-ES";
  utterance.pitch = 1.1;
  utterance.rate = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const spanishFemale = voices.find(
    (v) => v.lang.startsWith("es") && v.name.toLowerCase().includes("female")
  ) || voices.find((v) => v.lang.startsWith("es")) || voices[0];
  if (spanishFemale) utterance.voice = spanishFemale;

  window.speechSynthesis.speak(utterance);
}

const GREETING = "Sistemas en línea. Cortana conectada y lista para asistirle, Jefe. ¿Cuál es nuestro siguiente movimiento?";

export default function CortanaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadVoices = () => window.speechSynthesis?.getVoices();
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const handleStartProtocol = useCallback(() => {
    if (hasGreeted) return;
    setHasGreeted(true);
    setIsOpen(true);
    const greetMsg: Message = { role: "assistant", content: GREETING };
    setMessages([greetMsg]);
    setTimeout(() => speakText(GREETING), 300);
  }, [hasGreeted]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("cortana-chat", {
        body: {
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const replyText = data?.reply;
      if (!replyText) throw new Error("Sin respuesta del servidor");

      const assistantMsg: Message = { role: "assistant", content: replyText };
      setMessages((prev) => [...prev, assistantMsg]);
      speakText(replyText);
    } catch (err: any) {
      console.error("Error:", err);
      const errorMsg = "Error en los sistemas, Jefe. Verifique la conexión e intente nuevamente.";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasGreeted) {
    return (
      <button
        onClick={handleStartProtocol}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-3 rounded-full border-2 border-primary bg-primary/10 hover:bg-primary/20 transition-all animate-cyan-pulse cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-full overflow-hidden border border-primary">
          <img src={cortanaGif} alt="Cortana" className="w-full h-full object-cover" />
        </div>
        <span className="font-display text-primary text-sm tracking-widest uppercase font-semibold">
          Iniciar Protocolo Cortana
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-20 h-20 rounded-full overflow-hidden border-2 border-primary animate-cyan-pulse cursor-pointer transition-transform hover:scale-110 focus:outline-none"
        aria-label="Abrir Cortana"
      >
        <img src={cortanaGif} alt="Cortana" className="w-full h-full object-cover" />
      </button>

      {isOpen && (
        <div
          className="fixed bottom-28 right-6 z-50 w-[380px] max-h-[520px] flex flex-col rounded-2xl border border-holo-border overflow-hidden animate-holo-flicker"
          style={{
            background: "linear-gradient(135deg, hsla(215,60%,12%,0.92), hsla(210,50%,8%,0.95))",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 40px hsla(190,100%,50%,0.15), inset 0 1px 0 hsla(190,100%,50%,0.1)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-holo-border relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary">
                <img src={cortanaGif} alt="Cortana" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-primary tracking-wider">CORTANA</h3>
                <p className="text-[10px] text-muted-foreground tracking-widest uppercase">IA — UNSC</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-primary transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative z-10 min-h-[300px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-secondary text-secondary-foreground rounded-br-sm"
                      : "border border-holo-border text-foreground rounded-bl-sm"
                  }`}
                  style={msg.role === "assistant" ? { background: "hsla(200,50%,15%,0.6)" } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="px-3 py-2 rounded-xl border border-holo-border text-sm text-muted-foreground"
                  style={{ background: "hsla(200,50%,15%,0.6)" }}
                >
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
                    <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 border-t border-holo-border relative z-10">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Comuníquese, Jefe..."
                className="flex-1 bg-secondary/50 border border-holo-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-body"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-30 transition-colors border border-primary/30"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
