import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { db, ref, onValue, push, set, update, remove } from '../firebase';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const NOTES_PATH = 'notes';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly notesSubject = new BehaviorSubject<Note[]>([]);
  readonly notes$ = this.notesSubject.asObservable();

  constructor() {
    onValue(ref(db, NOTES_PATH), (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        this.notesSubject.next([]);
        return;
      }
      const notes: Note[] = Object.entries(val).map(([key, data]: [string, any]) => ({
        id: key,
        title: data.title,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }));
      notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      this.notesSubject.next(notes);
    });
  }

  get notes(): Note[] {
    return this.notesSubject.value;
  }

  async add(title: string, content: string): Promise<void> {
    const now = new Date().toISOString();
    const newRef = push(ref(db, NOTES_PATH));
    await set(newRef, { title, content, createdAt: now, updatedAt: now });
  }

  async updateNote(id: string, title: string, content: string): Promise<void> {
    await update(ref(db, `${NOTES_PATH}/${id}`), {
      title,
      content,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await remove(ref(db, `${NOTES_PATH}/${id}`));
  }

  async deleteAll(): Promise<void> {
    await remove(ref(db, NOTES_PATH));
  }

  exportNotes(): string {
    return JSON.stringify(this.notes, null, 2);
  }

  async importNotes(json: string): Promise<number> {
    const imported: Note[] = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    const existing = new Set(this.notes.map(n => n.id));
    let count = 0;
    for (const note of imported) {
      if (note.title && note.content) {
        if (!existing.has(note.id)) {
          const now = new Date().toISOString();
          const newRef = push(ref(db, NOTES_PATH));
          await set(newRef, {
            title: note.title,
            content: note.content,
            createdAt: note.createdAt || now,
            updatedAt: note.updatedAt || now,
          });
          count++;
        }
      }
    }
    return count;
  }
}
