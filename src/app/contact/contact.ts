import { Component, signal, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = 'service_0n6caqf';
const EMAILJS_TEMPLATE_ID = 'template_bp3yu99';
const EMAILJS_PUBLIC_KEY = 'n5k1Dugn47_ngZpbk';
const RECAPTCHA_SITE_KEY = '6Lc6iJwsAAAAAAU_Ig9_YNqedfZ0Tk_UiDP_Pblk';

declare const grecaptcha: {
  render(container: HTMLElement, params: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }): number;
  reset(widgetId: number): void;
};

@Component({
  selector: 'app-contact',
  imports: [
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact implements AfterViewInit {
  name = '';
  email = '';
  subject = '';
  message = '';

  sending = signal(false);
  status = signal<'idle' | 'success' | 'error' | 'captcha'>('idle');

  private recaptchaToken = '';
  private widgetId = -1;
  private recaptchaEl = viewChild<ElementRef>('recaptchaDiv');

  ngAfterViewInit(): void {
    const el = this.recaptchaEl();
    if (el) {
      this.widgetId = grecaptcha.render(el.nativeElement, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => { this.recaptchaToken = token; },
        'expired-callback': () => { this.recaptchaToken = ''; },
      });
    }
  }

  async send(): Promise<void> {
    if (!this.name.trim() || !this.email.trim() || !this.message.trim()) return;

    if (!this.recaptchaToken) {
      this.status.set('captcha');
      return;
    }

    this.sending.set(true);
    this.status.set('idle');

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: this.name,
          from_email: this.email,
          subject: this.subject,
          message: this.message,
          'g-recaptcha-response': this.recaptchaToken,
        },
        { publicKey: EMAILJS_PUBLIC_KEY },
      );
      this.status.set('success');
      this.name = '';
      this.email = '';
      this.subject = '';
      this.message = '';
    } catch (err) {
      console.error('EmailJS error:', err);
      this.status.set('error');
    } finally {
      this.recaptchaToken = '';
      if (this.widgetId >= 0) grecaptcha.reset(this.widgetId);
      this.sending.set(false);
    }
  }

  reset(): void {
    this.status.set('idle');
  }
}
