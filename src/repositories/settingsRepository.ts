import { localStore } from "./localStore";
export const settingsRepository = {
  async getNumber(key: string, fallback: number) { return localStore.get<number>(`settings:${key}`) ?? fallback; },
  async getBoolean(key: string, fallback: boolean) { return localStore.get<boolean>(`settings:${key}`) ?? fallback; },
  async getString(key: string, fallback: string) { return localStore.get<string>(`settings:${key}`) ?? fallback; },
  async set(key: string, value: string | number | boolean) { localStore.set(`settings:${key}`, value); }
};
