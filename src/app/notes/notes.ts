import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
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
    MatProgressBarModule,
    MatDatepickerModule,
    DatePipe,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './notes.html',
  styleUrl: './notes.css',
})
export class Notes implements OnInit, OnDestroy {
  private readonly svc = inject(NotesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub!: Subscription;

  notes: Note[] = [];
  newTitle = '';
  newContent = '';
  newEventDate: Date | null = null;

  editingId: string | null = null;
  editTitle = '';
  editContent = '';
  editEventDate: Date | null = null;

  errorMessage = '';
  confirmingDeleteAll = false;
  showForm = false;
  selectedFile: File | null = null;
  uploading = false;

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
      this.uploading = !!this.selectedFile;
      this.cdr.detectChanges();
      const eventDate = this.newEventDate ? this.newEventDate.toISOString() : undefined;
      await this.svc.add(title, content, eventDate, this.selectedFile ?? undefined);
      this.newTitle = '';
      this.newContent = '';
      this.newEventDate = null;
      this.selectedFile = null;
      this.showForm = false;
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to add note.';
    } finally {
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  async removeNoteFile(note: Note): Promise<void> {
    if (!note.file) return;
    try {
      this.errorMessage = '';
      await this.svc.removeFile(note.id, note.file.storagePath);
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to remove file.';
      this.cdr.detectChanges();
    }
  }

  isImage(name: string): boolean {
    return /\.(jpe?g|png|gif|webp|svg)$/i.test(name);
  }

  startEdit(note: Note): void {
    this.editingId = note.id;
    this.editTitle = note.title;
    this.editContent = note.content;
    this.editEventDate = note.eventDate ? new Date(note.eventDate) : null;
  }

  async saveEdit(): Promise<void> {
    if (!this.editingId) return;
    try {
      this.errorMessage = '';
      const eventDate = this.editEventDate ? this.editEventDate.toISOString() : undefined;
      await this.svc.updateNote(this.editingId, this.editTitle.trim(), this.editContent.trim(), eventDate);
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
    this.editEventDate = null;
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

}
