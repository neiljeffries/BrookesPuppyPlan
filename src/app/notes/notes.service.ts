import { Injectable } from '@angular/core';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'brookes_puppy_notes';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private notes: Note[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    this.notes = raw ? JSON.parse(raw) : [];
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
  }

  getAll(): Note[] {
    return [...this.notes];
  }

  add(title: string, content: string): Note {
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.unshift(note);
    this.save();
    return note;
  }

  update(id: string, title: string, content: string): void {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.title = title;
      note.content = content;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  delete(id: string): void {
    this.notes = this.notes.filter(n => n.id !== id);
    this.save();
  }

  deleteAll(): void {
    this.notes = [];
    this.save();
  }

  exportNotes(): string {
    return JSON.stringify(this.notes, null, 2);
  }

  importNotes(json: string): number {
    const imported: Note[] = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error('Invalid format');
    let count = 0;
    for (const note of imported) {
      if (note.id && note.title && note.content) {
        const exists = this.notes.find(n => n.id === note.id);
        if (!exists) {
          this.notes.unshift(note);
          count++;
        }
      }
    }
    this.save();
    return count;
  }
}
