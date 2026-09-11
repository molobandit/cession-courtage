import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFY_PREFS, parseNotifyPrefs } from "@/lib/account/notify-prefs";

describe("parseNotifyPrefs", () => {
  it("prend tout par défaut", () => {
    expect(parseNotifyPrefs(null)).toEqual(DEFAULT_NOTIFY_PREFS);
  });

  it("conserve une désactivation", () => {
    expect(parseNotifyPrefs(JSON.stringify({ messages: false, billing: true }))).toMatchObject({
      messages: false,
      billing: true,
      offers: true,
    });
  });
});
