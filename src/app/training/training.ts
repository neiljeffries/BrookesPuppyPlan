import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-training',
  imports: [MatCardModule, MatIconModule, MatTabsModule],
  templateUrl: './training.html',
  styleUrl: './training.css',
})
export class Training {}
