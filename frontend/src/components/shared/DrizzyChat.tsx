import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const ease = [0.16, 1, 0.3, 1] as const;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function DrizzyChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hey! I'm Drizzy, your AI stylist. What's the vibe for today?" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;
    
    const content = inputValue.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      // Send the chat history to the backend
      const response = await api.post("/ai/chat", {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      });
      
      const replyText = response.data?.reply || "Oops, I'm having trouble thinking right now.";
      
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: replyText }
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I couldn't connect right now! Try again in a moment." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed z-40 bottom-20 md:bottom-0 right-4 md:right-6 flex items-end gap-1 md:gap-2 pointer-events-none">
      {/* <DrizzyMascot className="w-[72px] h-[72px] md:w-[120px] md:h-[120px] drop-shadow-[0_8px_18px_hsl(0_0%_0%/0.22)]" /> */}

      <motion.div
        initial={false}
        animate={{
          width: open ? 350 : 200,
          padding: open ? 16 : 10,
        }}
        transition={{ duration: 0.32, ease }}
        onClick={!open ? () => setOpen(true) : undefined}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!open && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        role={!open ? "button" : undefined}
        tabIndex={!open ? 0 : -1}
        aria-label={!open ? "Open Drizzy chat" : undefined}
        whileHover={!open ? { y: -2 } : undefined}
        whileTap={!open ? { scale: 0.97 } : undefined}
        style={{
          maxWidth: "calc(100vw - 2rem)",
          cursor: open ? "default" : "pointer",
          boxShadow: open
            ? "0 24px 56px -16px hsl(0 0% 0% / 0.28), 0 8px 16px -8px hsl(0 0% 0% / 0.18)"
            : "0 12px 32px -12px hsl(0 0% 0% / 0.28), 0 4px 12px -4px hsl(0 0% 0% / 0.15)",
        }}
        className="kit-card md:mb-6 pointer-events-auto flex-shrink-0 flex flex-col"
      >
        <motion.div layout className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "kit-icon-box kit-icon-box-accent flex-shrink-0 transition-all",
                isTyping && "animate-pulse"
              )}
              style={{ width: 36, height: 36 }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-display text-sm font-semibold kit-strong truncate">
                {open ? "Chat with Drizzy" : "Drizzy"}
              </p>
              <p className="text-[10px] kit-muted">
                {isTyping ? "Drizzy is typing..." : "AI Stylist Assistant"}
              </p>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.button
                key="close"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, ease }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                aria-label="Close chat"
                className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-surface))] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="body"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 350, marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.26, ease }}
              style={{ overflow: "hidden" }}
              className="flex flex-col"
            >
              <div className="flex-1 overflow-y-auto pr-2 pb-2 space-y-3 flex flex-col text-sm scrollbar-thin">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "px-3 py-2 rounded-2xl max-w-[85%] break-words",
                      msg.role === "user"
                        ? "bg-black text-white dark:bg-white dark:text-black self-end rounded-br-sm"
                        : "bg-[hsl(var(--sidebar-surface))] border border-[hsl(var(--sidebar-border))] self-start rounded-bl-sm kit-strong"
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {isTyping && (
                  <div className="bg-[hsl(var(--sidebar-surface))] border border-[hsl(var(--sidebar-border))] self-start rounded-2xl rounded-bl-sm px-3 py-2 text-xs kit-muted flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="mt-2 pt-2 border-t border-[hsl(var(--sidebar-border))] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask for an outfit..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent text-sm min-w-0 outline-none placeholder:kit-muted kit-strong"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
