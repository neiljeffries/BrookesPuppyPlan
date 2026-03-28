import { Injectable } from '@angular/core';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { firebaseApp, db, ref, update, onValue } from './firebase';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = getAuth(firebaseApp);
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly readySubject = new BehaviorSubject<boolean>(false);
  private readonly roleSubject = new BehaviorSubject<string | null>(null);

  user$ = this.userSubject.asObservable();
  ready$ = this.readySubject.asObservable();
  role$ = this.roleSubject.asObservable();
  isAdmin$ = this.role$.pipe(map(role => role === 'admin'));

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
      if (user) {
        this.saveUserProfile(user);
        this.loadRole(user.uid);
      } else {
        this.roleSubject.next(null);
        this.readySubject.next(true);
      }
    });
  }

  private saveUserProfile(user: User): void {
    update(ref(db, `users/${user.uid}`), {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
    });
  }

  private loadRole(uid: string): void {
    onValue(ref(db, `users/${uid}/role`), (snapshot) => {
      this.roleSubject.next(snapshot.val() ?? null);
      this.readySubject.next(true);
    }, { onlyOnce: true });
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  get role(): string | null {
    return this.roleSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  get isAdmin(): boolean {
    return this.roleSubject.value === 'admin';
  }

  async signInWithGoogle(): Promise<void> {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}
