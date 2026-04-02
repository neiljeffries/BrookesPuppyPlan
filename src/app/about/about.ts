import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

const WINSTON_BIRTHDAY = new Date(2025, 8, 24); // September 24, 2025

@Component({
  selector: 'app-about',
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  readonly birthday = 'September 24, 2025';
  readonly barking = signal(false);
  private barkAudio: HTMLAudioElement | null = null;

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

  bark(): void {
    if (this.barking()) return;
    this.barking.set(true);

    if (!this.barkAudio) {
      this.barkAudio = new Audio('small-dog-bark.mp3');
    }

    const audio = this.barkAudio;
    audio.currentTime = 0;
    audio.play().then(() => {
      audio.addEventListener('ended', () => this.barking.set(false), { once: true });
    }).catch(() => {
      this.barking.set(false);
    });
  }
}
