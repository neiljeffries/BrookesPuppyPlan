import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { db, ref, onValue, push, set, update, remove, storage, storageRef, uploadBytes, getDownloadURL, deleteObject } from '../firebase';

export interface NoteFile {
  name: string;
  url: string;
  storagePath: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  eventDate?: string;
  file?: NoteFile;
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
        eventDate: data.eventDate ?? undefined,
        file: data.file ?? undefined,
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

  async add(title: string, content: string, eventDate?: string, file?: File): Promise<void> {
    const now = new Date().toISOString();
    const newRef = push(ref(db, NOTES_PATH));
    const noteData: any = { title, content, createdAt: now, updatedAt: now };
    if (eventDate) noteData.eventDate = eventDate;
    if (file) {
      noteData.file = await this.uploadFile(newRef.key!, file);
    }
    await set(newRef, noteData);
  }

  async updateNote(id: string, title: string, content: string, eventDate?: string): Promise<void> {
    const data: any = { title, content, updatedAt: new Date().toISOString() };
    data.eventDate = eventDate ?? null;
    await update(ref(db, `${NOTES_PATH}/${id}`), data);
  }

  async delete(id: string): Promise<void> {
    const note = this.notes.find(n => n.id === id);
    if (note?.file) {
      try { await deleteObject(storageRef(storage, note.file.storagePath)); } catch {}
    }
    await remove(ref(db, `${NOTES_PATH}/${id}`));
  }

  async deleteAll(): Promise<void> {
    for (const note of this.notes) {
      if (note.file) {
        try { await deleteObject(storageRef(storage, note.file.storagePath)); } catch {}
      }
    }
    await remove(ref(db, NOTES_PATH));
  }

  async removeFile(noteId: string, storagePath: string): Promise<void> {
    try { await deleteObject(storageRef(storage, storagePath)); } catch {}
    await update(ref(db, `${NOTES_PATH}/${noteId}`), { file: null, updatedAt: new Date().toISOString() });
  }

  private async uploadFile(noteId: string, file: File): Promise<NoteFile> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `notes/${noteId}/${safeName}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { name: file.name, url, storagePath: path };
  }

}
