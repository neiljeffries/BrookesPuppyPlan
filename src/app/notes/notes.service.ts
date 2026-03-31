import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { db, ref, onValue, push, set, update, remove, storage, storageRef, uploadBytes, getDownloadURL, deleteObject } from '../firebase';
import { AuthService } from '../auth.service';

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

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly auth = inject(AuthService);
  private readonly notesSubject = new BehaviorSubject<Note[]>([]);
  readonly notes$ = this.notesSubject.asObservable();
  private uid: string | null = null;
  private unsubscribe: (() => void) | null = null;

  private get notesPath(): string {
    return `notes/${this.uid}`;
  }

  constructor() {
    this.auth.user$.subscribe(user => {
      // Tear down previous listener
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      this.uid = user?.uid ?? null;
      if (!this.uid) {
        this.notesSubject.next([]);
        return;
      }
      const unsub = onValue(ref(db, this.notesPath), (snapshot) => {
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
      this.unsubscribe = unsub;
    });
  }

  get notes(): Note[] {
    return this.notesSubject.value;
  }

  async add(title: string, content: string, eventDate?: string, file?: File): Promise<void> {
    const now = new Date().toISOString();
    const newRef = push(ref(db, this.notesPath));
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
    await update(ref(db, `${this.notesPath}/${id}`), data);
  }

  async delete(id: string): Promise<void> {
    const note = this.notes.find(n => n.id === id);
    if (note?.file) {
      try { await deleteObject(storageRef(storage, note.file.storagePath)); } catch {}
    }
    await remove(ref(db, `${this.notesPath}/${id}`));
  }

  async deleteAll(): Promise<void> {
    for (const note of this.notes) {
      if (note.file) {
        try { await deleteObject(storageRef(storage, note.file.storagePath)); } catch {}
      }
    }
    await remove(ref(db, this.notesPath));
  }

  async removeFile(noteId: string, storagePath: string): Promise<void> {
    try { await deleteObject(storageRef(storage, storagePath)); } catch {}
    await update(ref(db, `${this.notesPath}/${noteId}`), { file: null, updatedAt: new Date().toISOString() });
  }

  private async uploadFile(noteId: string, file: File): Promise<NoteFile> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `notes/${this.uid}/${noteId}/${safeName}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { name: file.name, url, storagePath: path };
  }

}
