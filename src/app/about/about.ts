import { Component, computed, signal, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

const WINSTON_BIRTHDAY = new Date(2025, 8, 24); // September 24, 2025
const THUNDER_BIRTHDAY = new Date(2019, 7, 24); // August 24, 2019
const JAX_BIRTHDAY = new Date(2017, 8, 28); // September 28, 2017

@Component({
  selector: 'app-about',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About implements OnInit {
  readonly showContent = signal(false);
  readonly birthday = 'September 24, 2025';
  readonly thunderBirthday = 'August 24, 2019';
  readonly jaxBirthday = 'September 28, 2017';

  readonly age = computed(() => this.calcAge(WINSTON_BIRTHDAY));
  readonly thunderAge = computed(() => this.calcAge(THUNDER_BIRTHDAY));
  readonly jaxAge = computed(() => this.calcAge(JAX_BIRTHDAY));

  ngOnInit() {
    setTimeout(() => this.showContent.set(true), 7000);
  }

  onVideoEnded(event: Event) {
    const video = event.target as HTMLVideoElement;
    video.currentTime = video.duration;
    video.pause();
  }

  private calcAge(birthday: Date): string {
    const now = new Date();
    let years = now.getFullYear() - birthday.getFullYear();
    let months = now.getMonth() - birthday.getMonth();
    let days = now.getDate() - birthday.getDate();

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
  }
}
