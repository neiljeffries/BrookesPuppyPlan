import { Injectable } from '@angular/core';
import {
  getAuth, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider, signOut, onAuthStateChanged, User,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  setPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { firebaseApp, db, ref, update, get, set } from './firebase';
import { BehaviorSubject, ReplaySubject, combineLatest, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = getAuth(firebaseApp);
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly readySubject = new BehaviorSubject<boolean>(false);
  private readonly rolesSubject = new BehaviorSubject<Record<string, boolean>>({});
  private barkAudio: HTMLAudioElement | null = null;
  private readonly barkSubject = new ReplaySubject<void>(1, 3000);

  bark$ = this.barkSubject.asObservable();
  user$ = this.userSubject.asObservable();
  ready$ = this.readySubject.asObservable();
  roles$ = this.rolesSubject.asObservable();
  isAdmin$ = this.roles$.pipe(map(roles => roles['admin'] === true));
  hasChatAccess$ = this.roles$.pipe(map(roles => roles['admin'] === true || roles['user'] === true));
  needsRegistration$ = combineLatest([this.user$, this.roles$, this.ready$]).pipe(
    map(([user, roles, ready]) => ready && !!user && roles['user'] !== true && roles['admin'] !== true)
  );

  constructor() {
    this.init();
    onAuthStateChanged(this.auth, (user) => {
      const wasLoggedOut = !this.userSubject.value;
      this.userSubject.next(user);
      if (user) {
        if (wasLoggedOut) this.playBark();
        this.saveUserProfile(user);
        this.loadRoles(user.uid);
      } else {
        this.rolesSubject.next({});
        this.readySubject.next(true);
      }
    });
    this.listenForVisibility();
  }

  private init(): void {
    setPersistence(this.auth, browserLocalPersistence).then(() =>
      getRedirectResult(this.auth)
    ).then(result => {
      if (result?.user) {
        this.userSubject.next(result.user);
        this.saveUserProfile(result.user);
        this.loadRoles(result.user.uid);
      }
    }).catch(() => {});
  }

  private listenForVisibility(): void {
    globalThis.document?.addEventListener('visibilitychange', () => {
      if (globalThis.document.visibilityState === 'visible' && !this.userSubject.value) {
        this.auth.authStateReady().then(() => {
          const user = this.auth.currentUser;
          if (user) {
            this.userSubject.next(user);
            this.saveUserProfile(user);
            this.loadRoles(user.uid);
          }
        });
      }
    });
  }

  private saveUserProfile(user: User): void {
    const provider = user.providerData[0]?.providerId || 'unknown';
    update(ref(db, `users/${user.uid}`), {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
      provider,
    });
  }

  private async loadRoles(uid: string): Promise<void> {
    // Try new 'roles' path first
    const rolesSnap = await get(ref(db, `users/${uid}/roles`));
    const rolesVal = rolesSnap.val();
    if (rolesVal && typeof rolesVal === 'object') {
      this.rolesSubject.next(rolesVal);
    } else {
      // Backward compat: migrate old 'role' string to 'roles' map
      const roleSnap = await get(ref(db, `users/${uid}/role`));
      const oldRole = roleSnap.val();
      if (oldRole && typeof oldRole === 'string') {
        const migrated = { [oldRole]: true };
        await update(ref(db, `users/${uid}`), { roles: migrated });
        this.rolesSubject.next(migrated);
      } else {
        this.rolesSubject.next({});
      }
    }
    this.readySubject.next(true);
  }

  get user(): User | null {
    return this.userSubject.value;
  }

  get roles(): Record<string, boolean> {
    return this.rolesSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  get isAdmin(): boolean {
    return this.rolesSubject.value['admin'] === true;
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(this.auth, provider);
    } catch {
      await signInWithRedirect(this.auth, provider);
    }
  }

  async signInWithEmailPassword(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async createEmailPasswordAccount(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async sendEmailLink(email: string): Promise<void> {
    const actionCodeSettings = {
      url: globalThis.location.origin + '/register',
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(this.auth, email, actionCodeSettings);
    globalThis.localStorage.setItem('emailForSignIn', email);
  }

  async completeEmailLinkSignIn(): Promise<boolean> {
    if (!isSignInWithEmailLink(this.auth, globalThis.location.href)) return false;
    let email = globalThis.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = globalThis.prompt('Please confirm your email address');
    }
    if (!email) return false;
    await signInWithEmailLink(this.auth, email, globalThis.location.href);
    globalThis.localStorage.removeItem('emailForSignIn');
    return true;
  }

  async completeRegistration(): Promise<void> {
    const user = this.user;
    if (!user) return;
    await set(ref(db, `users/${user.uid}/roles/user`), true);
    await update(ref(db, `users/${user.uid}`), {
      registered: true,
      registrationDate: new Date().toISOString(),
    });
    // Reload roles so the UI updates immediately
    await this.loadRoles(user.uid);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  playBark(): void {
    this.barkAudio ??= new Audio('small-dog-bark.mp3');
    this.barkAudio.currentTime = 0;
    this.barkAudio.play().catch(() => {});
    this.barkSubject.next();
  }
}
