import { emptyBrowserUsageState, localDayKey, type BrowserUsageState } from "../lib/browserUsageState";
import { localStore } from "./localStore";

const storageKey = "browser-usage:whitelist";

export const browserUsageRepository = {
  async load(): Promise<BrowserUsageState> {
    const state = localStore.get<BrowserUsageState>(storageKey);
    if (!state || state.dayLocal !== localDayKey() || !state.domains) return emptyBrowserUsageState();
    return state;
  },
  async save(state: BrowserUsageState) { localStore.set(storageKey, state); },
  async clear() { localStore.set(storageKey, emptyBrowserUsageState()); }
};
