import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { DatePipe } from '@angular/common';
import { NotesService, Note } from './notes.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    DatePipe,
  ],
  templateUrl: './notes.html',
  styleUrl: './notes.css',
})
export class Notes {
  private readonly svc = inject(NotesService);
  private readonly cdr = inject(ChangeDetectorRef);

  notes: Note[] = [];
  displayedColumns = ['title', 'content', 'date', 'actions'];
  newTitle = '';
  newContent = '';

  editingId: string | null = null;
  editTitle = '';
  editContent = '';

  importMessage = '';
  confirmingDeleteAll = false;

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.notes = this.svc.getAll();
  }

  addNote(): void {
    const title = this.newTitle.trim();
    const content = this.newContent.trim();
    if (!title || !content) return;
    this.svc.add(title, content);
    this.newTitle = '';
    this.newContent = '';
    this.refresh();
  }

  startEdit(note: Note): void {
    this.editingId = note.id;
    this.editTitle = note.title;
    this.editContent = note.content;
  }

  saveEdit(): void {
    if (!this.editingId) return;
    this.svc.update(this.editingId, this.editTitle.trim(), this.editContent.trim());
    this.cancelEdit();
    this.refresh();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editTitle = '';
    this.editContent = '';
  }

  deleteNote(id: string): void {
    this.svc.delete(id);
    if (this.editingId === id) this.cancelEdit();
    this.refresh();
  }

  deleteAllNotes(): void {
    this.svc.deleteAll();
    this.cancelEdit();
    this.confirmingDeleteAll = false;
    this.refresh();
  }

  exportNotes(): void {
    const json = this.svc.exportNotes();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'puppy-notes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = this.svc.importNotes(text);
      this.importMessage = `Imported ${count} new note${count === 1 ? '' : 's'}.`;
      this.refresh();
      this.cdr.detectChanges();
    } catch {
      this.importMessage = 'Invalid file format.';
    }
    setTimeout(() => (this.importMessage = ''), 4000);
    input.value = '';
  }
}
