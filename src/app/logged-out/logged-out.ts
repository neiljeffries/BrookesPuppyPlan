import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-logged-out',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './logged-out.html',
  styleUrl: './logged-out.css',
})
export class LoggedOut {
  private readonly auth = inject(AuthService);

  async signIn(): Promise<void> {
    await this.auth.signInWithGoogle();
  }
}
