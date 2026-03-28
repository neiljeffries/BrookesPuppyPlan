import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { db, ref, onValue } from '../firebase';
import { Unsubscribe } from 'firebase/database';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './test.html',
  styleUrl: './test.css',
})
export class Test implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);

  testValue: string | null = null;
  loading = true;
  error: string | null = null;
  private unsubscribe: Unsubscribe | null = null;

  ngOnInit(): void {
    this.unsubscribe = onValue(
      ref(db, 'testkey'),
      (snapshot) => {
        this.testValue = snapshot.val();
        this.loading = false;
        this.cdr.detectChanges();
      },
      (err) => {
        this.error = err.message;
        this.loading = false;
        this.cdr.detectChanges();
      }
    );
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
