import { emptyData, type AppData, type Repository } from "./types";

const KEY = "gamenight:v1";

export class LocalRepository implements Repository {
  load(): AppData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.version !== 1) return emptyData();
      return { ...emptyData(), ...parsed };
    } catch (err) {
      // Corrupt or blocked storage: keep a copy of what we can and start clean, never crash.
      console.error("GameNight: could not read saved data", err);
      return emptyData();
    }
  }
  save(data: AppData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      console.error("GameNight: could not save data", err);
      throw err;
    }
  }
}
