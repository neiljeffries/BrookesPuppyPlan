import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatListModule, MatIconModule, MatDividerModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private barkSub?: Subscription;

  readonly barkBubbles = signal<number[]>([]);

  ngOnInit(): void {
    this.barkSub = this.auth.bark$.subscribe(() => this.showBarkBubbles());
  }

  ngOnDestroy(): void {
    this.barkSub?.unsubscribe();
  }

  onPuppyClick(): void {
    if (this.barkBubbles().length) return;
    this.auth.playBark();
  }

  private showBarkBubbles(): void {
    const ids: number[] = [];
    const delays = [800, 1400, 2300];
    for (let i = 0; i < 3; i++) {
      const id = Date.now() + i;
      setTimeout(() => {
        ids.push(id);
        this.barkBubbles.set([...ids]);
      }, delays[i]);
    }
    // Remove all bubbles after last one has had time to animate
    setTimeout(() => {
      this.barkBubbles.set([]);
    }, delays[2] + 800);
  }
}
