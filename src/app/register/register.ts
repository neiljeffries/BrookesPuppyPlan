import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, FormsModule, AsyncPipe],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  email = '';
  emailSent = false;
  registering = false;
  registered = false;
  error = '';

  ngOnInit(): void {
    this.auth.completeEmailLinkSignIn().then((completed) => {
      if (completed) {
        this.emailSent = false;
        this.cdr.detectChanges();
      }
    }).catch((e: any) => {
      this.error = e.message || 'Failed to complete email sign-in';
      this.cdr.detectChanges();
    });
  }

  async signInWithGoogle(): Promise<void> {
    try {
      await this.auth.signInWithGoogle();
    } catch (e: any) {
      this.error = e.message || 'Sign-in failed';
    }
  }

  async sendEmailLink(): Promise<void> {
    if (!this.email) return;
    try {
      await this.auth.sendEmailLink(this.email);
      this.emailSent = true;
      this.error = '';
    } catch (e: any) {
      this.error = e.message || 'Failed to send email link';
    }
  }

  async completeRegistration(): Promise<void> {
    this.registering = true;
    try {
      await this.auth.completeRegistration();
      this.registered = true;
      setTimeout(() => this.router.navigate(['/']), 1500);
    } catch (e: any) {
      this.error = e.message || 'Registration failed';
    }
    this.registering = false;
  }
}
