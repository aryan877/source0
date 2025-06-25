import { ChatSession } from "@/services";
import { isToday, isWithinInterval, isYesterday, subDays } from "date-fns";

export interface CategorizedSessions {
  pinned: ChatSession[];
  today: ChatSession[];
  yesterday: ChatSession[];
  lastWeek: ChatSession[];
  older: ChatSession[];
}

export function categorizeSessions(sessions: ChatSession[]): CategorizedSessions {
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
    if (session.is_pinned) {
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
}
