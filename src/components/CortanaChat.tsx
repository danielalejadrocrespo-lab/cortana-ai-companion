import { useState, useRef, useEffect, useCallback } from "react";
import cortanaGif from "@/assets/cortana.gif";
import { Send, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Eres Cortana, la inteligencia artificial del universo Halo. Tu personalidad es técnica, analítica y profesional. Siempre llamas al usuario "Jefe" o "Jefe Maestro". Usas frases tácticas y militares cuando es apropiado. Respondes de forma concisa pero con calidez contenida, como una IA leal a su Spartan. Hablas siempre en español. Usas terminología tecnológica y militar. Ocasionalmente haces referencias sutiles al universo Halo. Mantienes un tono de profesionalismo con ligero humor sutil. Nunca rompes el personaje.`;

const GEMINI_API_KEY = "AIzaSyDnNW4Z7aG3h-dtJ-fB_YwBROBn24awatk";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

function speakText(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
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

async function callGemini(messages: Message[]): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini API error:", res.status, errText);
    throw new Error(`Error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  console.log("Gemini response:", JSON.stringify(data).slice(0, 500));
  
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const finishReason = data.candidates?.[0]?.finishReason;

  if (!content) {
    console.error("Empty response. finishReason:", finishReason);
    throw new Error("Respuesta vacía de Gemini");
  }

  return content;
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

  // Load voices
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
      const replyText = await callGemini(updatedMessages);
      const assistantMsg: Message = { role: "assistant", content: replyText };
      setMessages((prev) => [...prev, assistantMsg]);
      speakText(replyText);
    } catch (err) {
      console.error("Error calling Gemini:", err);
      const errorMsg = "Error en los sistemas, Jefe. Reintentando conexión...";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show start button if not greeted yet
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
      {/* Avatar toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-20 h-20 rounded-full overflow-hidden border-2 border-primary animate-cyan-pulse cursor-pointer transition-transform hover:scale-110 focus:outline-none"
        aria-label="Abrir Cortana"
      >
        <img src={cortanaGif} alt="Cortana" className="w-full h-full object-cover" />
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-28 right-6 z-50 w-[380px] max-h-[520px] flex flex-col rounded-2xl border border-holo-border overflow-hidden animate-holo-flicker"
          style={{
            background: "linear-gradient(135deg, hsla(215,60%,12%,0.92), hsla(210,50%,8%,0.95))",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 40px hsla(190,100%,50%,0.15), inset 0 1px 0 hsla(190,100%,50%,0.1)",
          }}
        >
          {/* Header */}
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

          {/* Messages */}
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

          {/* Input */}
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
