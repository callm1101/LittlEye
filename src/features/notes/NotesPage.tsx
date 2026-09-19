import { useCallback, useEffect, useMemo, useState } from "react";
import { notesRepository, type Note } from "../../repositories/notesRepository";

export function NotesPage({ onBack }: { onBack(): void }) {
  const [notes, setNotes] = useState<Note[]>([]); const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "" }); const [editingId, setEditingId] = useState<string>(); const [dirty, setDirty] = useState(false);
  useEffect(() => { void notesRepository.list().then(setNotes); }, []);
  const filtered = useMemo(() => notes.filter(n => `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase())), [notes, query]);
  const save = useCallback(async () => { if (!dirty || (!draft.title.trim() && !draft.body.trim())) return; const note = editingId ? await notesRepository.update(editingId, draft) : await notesRepository.create(draft); setEditingId(note.id); setNotes(await notesRepository.list()); setDirty(false); }, [dirty, draft, editingId]);
  useEffect(() => { if (!dirty) return; const timer = window.setTimeout(() => { void save(); }, 650); return () => window.clearTimeout(timer); }, [dirty, save]);
  function edit(note: Note) { setEditingId(note.id); setDraft({ title: note.title, body: note.body }); setDirty(false); }
  function change(field: "title" | "body", value: string) { setDraft(current => ({ ...current, [field]: value })); setDirty(true); }
  async function remove(id: string) { if (!window.confirm("确定删除这条笔记吗？你可以恢复最近删除的一条。")) return; await notesRepository.remove(id); setNotes(await notesRepository.list()); if (editingId === id) { setEditingId(undefined); setDraft({ title: "", body: "" }); setDirty(false); } }
  async function restore() { const note = await notesRepository.restoreLatest(); if (note) setNotes(await notesRepository.list()); }
  return <section className="page"><header><button onClick={onBack}>← 返回</button><h1>随记</h1><button onClick={() => { void save(); setEditingId(undefined); setDraft({ title: "", body: "" }); setDirty(false); }}>新建</button></header><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索笔记" aria-label="搜索笔记" />
    <div className="note-grid"><form className="editor" onSubmit={e => { e.preventDefault(); void save(); }}><input value={draft.title} onChange={e => change("title", e.target.value)} placeholder="标题（可选）" /><textarea value={draft.body} onChange={e => change("body", e.target.value)} placeholder="记录此刻的想法…" /><p className="hint">{dirty ? "正在自动保存…" : editingId ? "已保存" : "输入后会自动保存"}</p><button className="primary">立即保存</button></form>
      <div className="note-list"><button onClick={() => void restore()}>恢复最近删除</button>{filtered.length ? filtered.map(note => <article key={note.id} className={note.id === editingId ? "selected" : ""}><button className="note-open" onClick={() => edit(note)}><strong>{note.isPinned ? "📌 " : ""}{note.title || "无标题"}</strong><p>{note.body || "（空笔记）"}</p></button><div className="note-controls"><button onClick={() => void notesRepository.togglePin(note.id).then(() => notesRepository.list()).then(setNotes)}>{note.isPinned ? "取消固定" : "固定"}</button><button onClick={() => void remove(note.id)}>删除</button></div></article>) : <p className="hint">还没有匹配的笔记。</p>}</div></div>
  </section>;
}
