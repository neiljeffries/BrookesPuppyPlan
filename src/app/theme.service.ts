import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.loadPreference());

  constructor() {
    this.applyTheme(this.isDark());
  }

  toggle() {
    const dark = !this.isDark();
    this.isDark.set(dark);
    this.applyTheme(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  private applyTheme(dark: boolean) {
    document.documentElement.classList.toggle('dark-theme', dark);
  }

  private loadPreference(): boolean {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
