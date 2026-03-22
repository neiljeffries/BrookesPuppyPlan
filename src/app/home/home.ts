import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatListModule, MatIconModule, MatDividerModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
