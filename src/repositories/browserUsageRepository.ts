import { localDayKey, type BrowserUsageState } from "../lib/browserUsageState";
import { localStore } from "./localStore";

const storageKey = "browser-usage:bilibili.com";

export const browserUsageRepository = {
  async load(): Promise<BrowserUsageState> {
    const state = localStore.get<BrowserUsageState>(storageKey);
    if (!state || state.dayLocal !== localDayKey()) return { dayLocal: localDayKey(), accumulatedSeconds: 0 };
    return state;
  },
  async save(state: BrowserUsageState) { localStore.set(storageKey, state); },
  async clear() { localStore.set(storageKey, { dayLocal: localDayKey(), accumulatedSeconds: 0 }); }
};
