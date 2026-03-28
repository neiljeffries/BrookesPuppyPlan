import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { db, ref, onValue } from '../firebase';

export interface UserRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastLogin: string;
  role: string | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatIconModule, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);

  users: UserRecord[] = [];
  displayedColumns = ['photo', 'displayName', 'email', 'role', 'lastLogin'];
  loading = true;

  ngOnInit(): void {
    onValue(ref(db, 'users'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        this.users = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          displayName: val.displayName ?? '',
          email: val.email ?? '',
          photoURL: val.photoURL ?? '',
          lastLogin: val.lastLogin ?? '',
          role: val.role ?? null,
        }));
      } else {
        this.users = [];
      }
      this.loading = false;
      this.cdr.detectChanges();
    });
  }
}
