import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-contact',
  imports: [MatCardModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {}
