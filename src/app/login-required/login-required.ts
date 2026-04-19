import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-required',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, FormsModule, RouterModule],
  templateUrl: './login-required.html',
  styleUrl: './login-required.css',
})
export class LoginRequired {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  error = '';

  async signInWithGoogle(): Promise<void> {
    await this.auth.signInWithGoogle();
  }

  async signInWithEmail(): Promise<void> {
    try {
      await this.auth.signInWithEmailPassword(this.email, this.password);
      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = e.message || 'Sign-in failed';
    }
  }

  async resetPassword(): Promise<void> {
    if (!this.email) {
      this.error = 'Enter your email address first';
      return;
    }
    try {
      await this.auth.resetPassword(this.email);
      this.error = '';
      alert('Password reset email sent. Check your inbox.');
    } catch (e: any) {
      this.error = e.message || 'Failed to send reset email';
    }
  }
}
