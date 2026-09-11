export type NotifyPrefs = {
  messages: boolean;
  offers: boolean;
  deals: boolean;
  billing: boolean;
};

export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = {
  messages: true,
  offers: true,
  deals: true,
  billing: true,
};

export function parseNotifyPrefs(raw: string | null | undefined): NotifyPrefs {
  if (!raw) return { ...DEFAULT_NOTIFY_PREFS };
  try {
    const parsed = JSON.parse(raw) as Partial<NotifyPrefs>;
    return {
      messages: parsed.messages !== false,
      offers: parsed.offers !== false,
      deals: parsed.deals !== false,
      billing: parsed.billing !== false,
    };
  } catch {
    return { ...DEFAULT_NOTIFY_PREFS };
  }
}
