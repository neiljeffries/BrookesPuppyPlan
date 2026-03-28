import { Component, ViewChild, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { AsyncPipe } from '@angular/common';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    AsyncPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  closeSidenav() {
    this.sidenav.close();
  }

  async signIn() {
    await this.auth.signInWithGoogle();
    if (this.router.url === '/logged-out') {
      this.router.navigate(['/']);
    }
  }

  async signOut() {
    await this.auth.signOut();
    this.router.navigate(['/logged-out']);
  }
}
