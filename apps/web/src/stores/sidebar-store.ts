import { ChatSession } from "@/services";
import { isToday, isWithinInterval, isYesterday, subDays } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CategorizedSessions {
  pinned: ChatSession[];
  today: ChatSession[];
  yesterday: ChatSession[];
  lastWeek: ChatSession[];
  older: ChatSession[];
}

interface SidebarState {
  // Pinned Sessions State
  pinnedSessions: string[];

  // Actions
  togglePinnedSession: (sessionId: string) => void;
  removePinnedSession: (sessionId: string) => void;
  isPinnedSession: (sessionId: string) => boolean;
  categorizeSessions: (sessions: ChatSession[]) => CategorizedSessions;
  resetStore: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // Initial state
      pinnedSessions: [],

      // Actions
      togglePinnedSession: (sessionId) => {
        const { pinnedSessions } = get();
        const newPinnedSessions = pinnedSessions.includes(sessionId)
          ? pinnedSessions.filter((id) => id !== sessionId)
          : [...pinnedSessions, sessionId];
        set({ pinnedSessions: newPinnedSessions });
      },

      removePinnedSession: (sessionId) => {
        set((state) => ({
          pinnedSessions: state.pinnedSessions.filter((id) => id !== sessionId),
        }));
      },

      isPinnedSession: (sessionId) => {
        const { pinnedSessions } = get();
        return pinnedSessions.includes(sessionId);
      },

      categorizeSessions: (sessions) => {
        const { pinnedSessions } = get();
        const now = new Date();
        const lastWeekStart = subDays(now, 7);

        const categorized: CategorizedSessions = {
          pinned: [],
          today: [],
          yesterday: [],
          lastWeek: [],
          older: [],
        };

        sessions.forEach((session) => {
          const sessionDate = new Date(session.updated_at || 0);

          // First check if it's pinned
          if (pinnedSessions.includes(session.id)) {
            categorized.pinned.push(session);
            return;
          }

          // Then categorize by date
          if (isToday(sessionDate)) {
            categorized.today.push(session);
          } else if (isYesterday(sessionDate)) {
            categorized.yesterday.push(session);
          } else if (isWithinInterval(sessionDate, { start: lastWeekStart, end: now })) {
            categorized.lastWeek.push(session);
          } else {
            categorized.older.push(session);
          }
        });

        // Sort each category by updated_at (most recent first)
        Object.values(categorized).forEach((category: ChatSession[]) => {
          category.sort(
            (a: ChatSession, b: ChatSession) =>
              new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
          );
        });

        return categorized;
      },

      // Reset all data for logout
      resetStore: () => {
        set({
          pinnedSessions: [],
        });
      },
    }),
    {
      name: "sidebar-storage",
      partialize: (state) => ({
        pinnedSessions: state.pinnedSessions,
      }),
    }
  )
);
