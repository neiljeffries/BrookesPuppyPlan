import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-required',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './login-required.html',
  styleUrl: './login-required.css',
})
export class LoginRequired {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async signIn(): Promise<void> {
    await this.auth.signInWithGoogle();
    this.router.navigate(['/']);
  }
}
