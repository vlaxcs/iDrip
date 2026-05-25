import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Info, History, Trash2, Plus, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDrizzyChatStore } from "@/stores/useDrizzyChatStore";
import type { ChatMessage as Message } from "@/stores/useDrizzyChatStore";

const ease = [0.16, 1, 0.3, 1] as const;

function parseChatContent(text: string) {
  const tokenRegex = /(!?\[[^\]]+\]\([^)]+\))/;
  const tokens = text.split(tokenRegex);

  return tokens.map((token, i) => {
    const imgMatch = token.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return (
        <img
          key={i}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          className="w-full h-auto max-h-48 object-cover rounded-md my-2 border border-[hsl(var(--sidebar-border))]"
        />
      );
    }

    const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-[3px] text-blue-500 hover:text-blue-400 font-medium break-all"
        >
          {linkMatch[1]}
        </a>
      );
    }

    const formatted = token
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");

    return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const QUICK_PROMPTS = ["Classy", "Elegant", "Sporty"];

export function DrizzyChat() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [inputValue, setInputValue] = useState("");

  const {
    sessions,
    activeSessionId,
    isTyping,
    newSession,
    switchSession,
    deleteSession,
    sendMessage,
    activeSession,
  } = useDrizzyChatStore();

  const messages: Message[] = activeSession()?.messages ?? [];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // On every mount (including page refresh), start a brand-new session
  useEffect(() => {
    newSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, view]);

  const handleSend = (overrideContent?: string) => {
    const content = (overrideContent ?? inputValue).trim();
    if (!content || isTyping) return;
    setInputValue("");
    sendMessage(content);
  };

  // Sessions that have at least one user message (worth showing in history)
  const historySessions = sessions.filter((s) => s.messages.some((m) => m.role === "user"));

  return (
    <div className="fixed z-40 bottom-20 md:bottom-0 right-4 md:right-6 flex items-end gap-1 md:gap-2 pointer-events-none">
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
        {/* Header */}
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
                {open ? (view === "history" ? "Chat History" : "Chat with Drizzy") : "Drizzy"}
              </p>
              <p className="text-[10px] kit-muted">
                {isTyping ? "Drizzy is typing..." : "AI Stylist Assistant"}
              </p>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="header-actions"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, ease }}
                className="flex items-center gap-1 shrink-0"
              >
                {view === "history" ? (
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setView("chat"); }}
                    aria-label="Back to chat"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-surface))] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setView("history"); }}
                    aria-label="Chat history"
                    title="View past chats"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-surface))] transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpen(false); setView("chat"); }}
                  aria-label="Close chat"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-surface))] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Body */}
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
              {/* ── HISTORY VIEW ── */}
              {view === "history" ? (
                <div className="flex flex-col gap-2 h-full overflow-hidden">
                  <button
                    onClick={() => { newSession(); setView("chat"); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[hsl(var(--sidebar-border))] hover:bg-[hsl(var(--sidebar-surface))] transition-colors text-sm kit-strong shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    New chat
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {historySessions.length === 0 ? (
                      <p className="text-xs kit-muted text-center mt-6">No past chats yet.</p>
                    ) : (
                      historySessions.map((s) => {
                        const firstUserMsg = s.messages.find((m) => m.role === "user");
                        const title = firstUserMsg
                          ? firstUserMsg.content.slice(0, 42) + (firstUserMsg.content.length > 42 ? "…" : "")
                          : "Chat";
                        const isActive = s.id === activeSessionId;
                        return (
                          <div
                            key={s.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer group transition-colors",
                              isActive
                                ? "bg-[hsl(var(--sidebar-accent)/0.15)] ring-1 ring-[hsl(var(--sidebar-accent)/0.4)]"
                                : "hover:bg-[hsl(var(--sidebar-surface))]"
                            )}
                            onClick={() => { switchSession(s.id); setView("chat"); }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-medium truncate", isActive ? "text-[oklch(0.45_0.2_140)] dark:text-[hsl(var(--sidebar-accent))]" : "kit-strong")}>{title}</p>
                              <p className="text-[10px] kit-muted">{timeAgo(s.createdAt)}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 transition-all"
                              aria-label="Delete chat"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* ── CHAT VIEW ── */
                <>
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
                        {parseChatContent(msg.content)}
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex flex-col gap-3 mt-1 mb-2">
                        <div className="bg-[hsl(var(--sidebar-surface))] border border-[hsl(var(--sidebar-border))] self-start rounded-2xl rounded-bl-sm px-3 py-2 text-xs kit-muted flex items-center gap-1.5 w-fit">
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                        <div className="flex flex-col gap-2 mx-auto w-[90%] animate-in fade-in duration-500 delay-300 fill-mode-both">
                          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 italic">
                            <Info className="w-3.5 h-3.5" />
                            <span>estimated response time: 1 minute</span>
                          </div>
                          <div className="bg-[hsl(var(--sidebar-surface))] border border-[hsl(var(--sidebar-border))] rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-sm not-italic text-xs text-zinc-700 dark:text-zinc-300">
                            <div className="flex flex-col">
                              <span className="font-semibold kit-strong">Need faster responses?</span>
                              <span className="text-[10px] kit-muted">Skip the processing queue</span>
                            </div>
                            <button
                              onClick={() => window.location.href = '/subscription'}
                              className="bg-green-600 hover:bg-green-500 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors shrink-0 shadow-sm"
                            >
                              Upgrade
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="mt-2 pt-2 border-t border-[hsl(var(--sidebar-border))] flex flex-col gap-2 shrink-0">
                    {messages.length === 1 && !isTyping && (
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none w-full">
                        {QUICK_PROMPTS.map((p) => (
                          <button
                            key={p}
                            onClick={() => handleSend(`Make me a ${p.toLowerCase()} outfit`)}
                            className="px-3 py-1.5 text-[11px] whitespace-nowrap bg-[hsl(var(--sidebar-surface))] hover:bg-zinc-200 dark:hover:bg-zinc-800 kit-strong border border-[hsl(var(--sidebar-border))] rounded-full transition-colors font-medium flex-shrink-0"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
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
                        onClick={() => handleSend()}
                        disabled={!inputValue.trim() || isTyping}
                        className="p-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg disabled:opacity-50 transition-opacity"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

