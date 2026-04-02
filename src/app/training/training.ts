import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-training',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatExpansionModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule],
  templateUrl: './training.html',
  styleUrl: './training.css',
})
export class Training {
  guideSearch = signal('');

  guideVisible(name: string): boolean {
    const term = this.guideSearch().toLowerCase().trim();
    if (!term) return true;
    return name.toLowerCase().includes(term);
  }

  clearSearch(): void {
    this.guideSearch.set('');
  }
}
