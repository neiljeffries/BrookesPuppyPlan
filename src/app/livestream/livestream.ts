import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-livestream',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './livestream.html',
  styleUrl: './livestream.css',
})
export class Livestream {}
