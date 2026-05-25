import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type ChatSession = {
  id: string;
  createdAt: number;
  messages: ChatMessage[];
};

const GREETING: ChatMessage = {
  id: '0',
  role: 'assistant',
  content: "Hey! I'm Drizzy, your AI stylist. What's the vibe for today?",
};

function makeSession(): ChatSession {
  return { id: Date.now().toString(), createdAt: Date.now(), messages: [GREETING] };
}

type DrizzyChatState = {
  sessions: ChatSession[];        // persisted
  activeSessionId: string | null; // NOT persisted — null on refresh = fresh chat
  isTyping: boolean;              // NOT persisted

  // helpers
  activeSession: () => ChatSession | null;

  // actions
  newSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
};

export const useDrizzyChatStore = create<DrizzyChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isTyping: false,

      activeSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId) ?? null;
      },

      newSession: () => {
        // Prune empty sessions (only the greeting, no user messages)
        const cleaned = get().sessions.filter((s) => s.messages.length > 1);
        const session = makeSession();
        set({ sessions: [session, ...cleaned], activeSessionId: session.id });
      },

      switchSession: (id) => set({ activeSessionId: id }),

      deleteSession: (id) => {
        const remaining = get().sessions.filter((s) => s.id !== id);
        const activeSessionId =
          get().activeSessionId === id
            ? remaining[0]?.id ?? null
            : get().activeSessionId;
        // If no sessions left, create a fresh one
        if (remaining.length === 0) {
          const session = makeSession();
          set({ sessions: [session], activeSessionId: session.id });
        } else {
          set({ sessions: remaining, activeSessionId });
        }
      },

      sendMessage: async (content: string) => {
        const trimmed = content.trim();
        const { activeSessionId } = get();
        if (!trimmed || get().isTyping || !activeSessionId) return;

        const session = get().activeSession();
        if (!session) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: trimmed };
        const newMessages = [...session.messages, userMsg];

        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === activeSessionId ? { ...sess, messages: newMessages } : sess
          ),
          isTyping: true,
        }));

        try {
          const response = await api.post<{ reply?: string }>('/ai/chat', {
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          });
          const replyText = response?.reply || "Oops, I'm having trouble thinking right now.";
          const replyMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: replyText };
          set((s) => ({
            sessions: s.sessions.map((sess) =>
              sess.id === activeSessionId
                ? { ...sess, messages: [...sess.messages, replyMsg] }
                : sess
            ),
            isTyping: false,
          }));
        } catch (error) {
          const errText = error instanceof Error ? error.message : "Sorry, I couldn't connect right now! Try again in a moment.";
          const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: errText };
          set((s) => ({
            sessions: s.sessions.map((sess) =>
              sess.id === activeSessionId
                ? { ...sess, messages: [...sess.messages, errMsg] }
                : sess
            ),
            isTyping: false,
          }));
        }
      },
    }),
    {
      name: 'idrip-drizzy-chat',
      // Only persist sessions; activeSessionId and isTyping reset on every page load
      partialize: (s) => ({ sessions: s.sessions }),
    }
  )
);
