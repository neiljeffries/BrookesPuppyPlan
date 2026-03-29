import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

const WINSTON_BIRTHDAY = new Date(2025, 8, 24); // September 24, 2025

@Component({
  selector: 'app-about',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  readonly birthday = 'September 24, 2025';
  readonly age = computed(() => {
    const now = new Date();
    let years = now.getFullYear() - WINSTON_BIRTHDAY.getFullYear();
    let months = now.getMonth() - WINSTON_BIRTHDAY.getMonth();
    let days = now.getDate() - WINSTON_BIRTHDAY.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts: string[] = [];
    if (years) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    return parts.join(', ') || '0 days';
  });
}
