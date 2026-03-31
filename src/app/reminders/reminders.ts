import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { DatePipe } from '@angular/common';
import { NotificationService, Reminder, ReminderCategory, ReminderRepeat } from '../notification.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    DatePipe,
  ],
  templateUrl: './reminders.html',
  styleUrl: './reminders.css',
})
export class Reminders implements OnInit {
  readonly notifications = inject(NotificationService);
  readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  reminders: Reminder[] = [];
  permissionState = signal<NotificationPermission>('default');

  title = '';
  body = '';
  category: ReminderCategory = 'custom';
  dateTime = '';
  repeat: ReminderRepeat = 'none';

  readonly categories: { value: ReminderCategory; label: string; icon: string }[] = [
    { value: 'vet', label: 'Vet Appointment', icon: 'vaccines' },
    { value: 'training', label: 'Training', icon: 'school' },
    { value: 'feeding', label: 'Feeding', icon: 'restaurant' },
    { value: 'custom', label: 'Custom', icon: 'notifications' },
  ];

  readonly repeatOptions: { value: ReminderRepeat; label: string }[] = [
    { value: 'none', label: 'One-time' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
  ];

  ngOnInit(): void {
    this.notifications.loadReminders();
    this.notifications.reminders$.subscribe((r) => {
      this.reminders = r;
      this.cdr.detectChanges();
    });
    this.notifications.permission$.subscribe((p) => this.permissionState.set(p));
  }

  async enableNotifications() {
    await this.notifications.requestPermission();
  }

  getCategoryIcon(cat: ReminderCategory): string {
    return this.categories.find((c) => c.value === cat)?.icon ?? 'notifications';
  }

  getCategoryLabel(cat: ReminderCategory): string {
    return this.categories.find((c) => c.value === cat)?.label ?? 'Custom';
  }

  async addReminder() {
    if (!this.title.trim() || !this.dateTime) return;
    await this.notifications.addReminder({
      title: this.title.trim(),
      body: this.body.trim(),
      category: this.category,
      dateTime: new Date(this.dateTime).toISOString(),
      repeat: this.repeat,
    });
    this.title = '';
    this.body = '';
    this.category = 'custom';
    this.dateTime = '';
    this.repeat = 'none';
  }

  async deleteReminder(id: string) {
    await this.notifications.deleteReminder(id);
  }

  isPast(dateTime: string): boolean {
    return new Date(dateTime) < new Date();
  }
}
