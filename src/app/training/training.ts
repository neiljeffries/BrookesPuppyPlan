import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-training',
  imports: [MatCardModule, MatExpansionModule, MatIconModule, MatTabsModule],
  templateUrl: './training.html',
  styleUrl: './training.css',
})
export class Training {}
