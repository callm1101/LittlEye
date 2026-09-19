import { localStore } from "./localStore";
export type Note = { id: string; title: string; body: string; isPinned: boolean; createdAt: number; updatedAt: number; deletedAt?: number };
const storageKey = "notes";
export const notesRepository = {
  async list(): Promise<Note[]> { return (localStore.get<Note[]>(storageKey) ?? []).filter(note => !note.deletedAt).sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt - a.updatedAt); },
  async create(input: Pick<Note, "title" | "body">): Promise<Note> { const note: Note = { id: crypto.randomUUID(), ...input, isPinned: false, createdAt: Date.now(), updatedAt: Date.now() }; const notes = localStore.get<Note[]>(storageKey) ?? []; localStore.set(storageKey, [note, ...notes]); return note; },
  async update(id: string, input: Pick<Note, "title" | "body">) { const notes = localStore.get<Note[]>(storageKey) ?? []; const updated = notes.map(note => note.id === id ? { ...note, ...input, updatedAt: Date.now() } : note); localStore.set(storageKey, updated); return updated.find(note => note.id === id)!; },
  async togglePin(id: string) { const notes = localStore.get<Note[]>(storageKey) ?? []; const updated = notes.map(note => note.id === id ? { ...note, isPinned: !note.isPinned, updatedAt: Date.now() } : note); localStore.set(storageKey, updated); return updated.find(note => note.id === id)!; },
  async remove(id: string) { const notes = localStore.get<Note[]>(storageKey) ?? []; localStore.set(storageKey, notes.map(note => note.id === id ? { ...note, deletedAt: Date.now() } : note)); },
  async restoreLatest() { const notes = localStore.get<Note[]>(storageKey) ?? []; const deleted = notes.filter(note => note.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))[0]; if (!deleted) return undefined; const restored = { ...deleted, deletedAt: undefined, updatedAt: Date.now() }; localStore.set(storageKey, notes.map(note => note.id === restored.id ? restored : note)); return restored; }
};
