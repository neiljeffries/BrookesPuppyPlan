import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';
import { db, ref, onValue, set, remove } from '../firebase';
import { AuthService } from '../auth.service';

export interface UserRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastLogin: string;
  roles: Record<string, boolean>;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule, DatePipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);

  readonly availableRoles = ['admin', 'user'];
  users: UserRecord[] = [];
  displayedColumns = ['photo', 'displayName', 'email', 'role', 'lastLogin', 'actions'];
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
          roles: val.roles ?? {},
        }));
      } else {
        this.users = [];
      }
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  hasRole(user: UserRecord, role: string): boolean {
    return user.roles[role] === true;
  }

  activeRoles(user: UserRecord): string[] {
    return Object.keys(user.roles).filter(r => user.roles[r]);
  }

  async addRole(uid: string, role: string) {
    await set(ref(db, `users/${uid}/roles/${role}`), true);
  }

  isSelfAdminRole(uid: string, role: string): boolean {
    return role === 'admin' && uid === this.auth.user?.uid;
  }

  async removeRole(uid: string, role: string) {
    if (this.isSelfAdminRole(uid, role)) return;
    await remove(ref(db, `users/${uid}/roles/${role}`));
  }
}
