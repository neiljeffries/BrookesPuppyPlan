import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
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
export class Notes implements OnInit, OnDestroy {
  private readonly svc = inject(NotesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub!: Subscription;

  notes: Note[] = [];
  displayedColumns = ['title', 'content', 'date', 'actions'];
  newTitle = '';
  newContent = '';

  editingId: string | null = null;
  editTitle = '';
  editContent = '';

  importMessage = '';
  errorMessage = '';
  confirmingDeleteAll = false;

  ngOnInit(): void {
    this.sub = this.svc.notes$.subscribe(notes => {
      this.notes = notes;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  async addNote(): Promise<void> {
    const title = this.newTitle.trim();
    const content = this.newContent.trim();
    if (!title || !content) return;
    try {
      this.errorMessage = '';
      await this.svc.add(title, content);
      this.newTitle = '';
      this.newContent = '';
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to add note.';
      this.cdr.detectChanges();
    }
  }

  startEdit(note: Note): void {
    this.editingId = note.id;
    this.editTitle = note.title;
    this.editContent = note.content;
  }

  async saveEdit(): Promise<void> {
    if (!this.editingId) return;
    try {
      this.errorMessage = '';
      await this.svc.updateNote(this.editingId, this.editTitle.trim(), this.editContent.trim());
      this.cancelEdit();
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to save edit.';
      this.cdr.detectChanges();
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editTitle = '';
    this.editContent = '';
  }

  async deleteNote(id: string): Promise<void> {
    try {
      this.errorMessage = '';
      await this.svc.delete(id);
      if (this.editingId === id) this.cancelEdit();
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to delete note.';
      this.cdr.detectChanges();
    }
  }

  async deleteAllNotes(): Promise<void> {
    try {
      this.errorMessage = '';
      await this.svc.deleteAll();
      this.cancelEdit();
      this.confirmingDeleteAll = false;
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to delete notes.';
      this.cdr.detectChanges();
    }
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
      const count = await this.svc.importNotes(text);
      this.importMessage = `Imported ${count} new note${count === 1 ? '' : 's'}.`;
      this.cdr.detectChanges();
    } catch {
      this.importMessage = 'Invalid file format.';
    }
    setTimeout(() => {
      this.importMessage = '';
      this.cdr.detectChanges();
    }, 4000);
    input.value = '';
  }
}
