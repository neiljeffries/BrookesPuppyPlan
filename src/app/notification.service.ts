import { Injectable, inject } from '@angular/core';
import { firebaseApp, getMessaging, getToken, onMessage, db, ref, set, push, remove, onValue } from './firebase';
import type { Messaging } from 'firebase/messaging';
import { AuthService } from './auth.service';
import { BehaviorSubject } from 'rxjs';

export type ReminderCategory = 'vet' | 'training' | 'feeding' | 'custom';
export type ReminderRepeat = 'none' | 'daily' | 'weekly';

export interface Reminder {
  id?: string;
  title: string;
  body: string;
  category: ReminderCategory;
  dateTime: string;
  repeat: ReminderRepeat;
  sent?: boolean;
}

const VAPID_KEY = 'BFBAVK-e9lEFusYLjeAEhxzDrpYyjKDMB2r4txalD1ATQKzGVMPql6wNrChS4MhIXN-Daouti9zSHN-TjQaUlxM';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);
  private readonly remindersSubject = new BehaviorSubject<Reminder[]>([]);
  private readonly permissionSubject = new BehaviorSubject<NotificationPermission>(
    typeof Notification === 'undefined' ? 'default' : Notification.permission
  );

  reminders$ = this.remindersSubject.asObservable();
  permission$ = this.permissionSubject.asObservable();

  private messaging: Messaging | undefined;
  private messagingInitialised = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (!('serviceWorker' in navigator)) return;

    // Returning user already granted permission — bootstrap messaging now
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      this.bootstrapMessaging().catch((err) => console.error('FCM auto-init failed:', err));
    }
  }

  /** Register SW, create Messaging, getToken, then onMessage. */
  private async bootstrapMessaging(): Promise<void> {
    if (this.messagingInitialised) return;
    this.messagingInitialised = true;

    // Register (or update) the FCM service worker — do NOT unregister existing ones
    // so push subscriptions survive across page loads.
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      updateViaCache: 'none',
    });

    // If a new worker was installed, activate it immediately
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    await navigator.serviceWorker.ready;

    // Block stale SW messages during init to prevent the pushManager race condition
    const blockFirebaseMessages = (e: MessageEvent): void => {
      if (e.data?.firebaseMessaging) {
        e.stopImmediatePropagation();
      }
    };
    navigator.serviceWorker.addEventListener('message', blockFirebaseMessages);

    const msg = getMessaging(firebaseApp);
    this.messaging = msg;

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    // swRegistration is now set — safe to let messages through
    navigator.serviceWorker.removeEventListener('message', blockFirebaseMessages);

    console.log('[FCM] Token obtained:', token?.slice(0, 20) + '…');

    // Save token (overwrites any previous token with the same hash)
    const uid = this.auth.user?.uid;
    if (uid && token) {
      await set(ref(db, `users/${uid}/fcmTokens/${this.hashToken(token)}`), {
        token,
        createdAt: new Date().toISOString(),
      });
      console.log('[FCM] Token saved to RTDB for user', uid);
    }

    // Foreground message handler — use showNotification (more reliable than new Notification in Chrome)
    onMessage(msg, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      const { title, body } = payload.notification ?? payload.data ?? {};
      if (title && reg.active) {
        reg.showNotification(title, {
          body: body ?? '',
          icon: '/paw-icon-192.png',
        });
      }
    });
  }

  async requestPermission(): Promise<boolean> {
    const permission = await Notification.requestPermission();
    this.permissionSubject.next(permission);
    if (permission !== 'granted') return false;

    await this.bootstrapMessaging();
    return true;
  }

  loadReminders(): void {
    const uid = this.auth.user?.uid;
    if (!uid) return;
    onValue(ref(db, `users/${uid}/reminders`), (snap) => {
      const data = snap.val();
      if (!data) {
        this.remindersSubject.next([]);
        return;
      }
      const list: Reminder[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        title: val.title ?? '',
        body: val.body ?? '',
        category: val.category ?? 'custom',
        dateTime: val.dateTime ?? '',
        repeat: val.repeat ?? 'none',
        sent: val.sent ?? false,
      }));
      list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      this.remindersSubject.next(list);
    });
  }

  async addReminder(reminder: Omit<Reminder, 'id'>): Promise<void> {
    const uid = this.auth.user?.uid;
    if (!uid) return;
    await push(ref(db, `users/${uid}/reminders`), reminder);
  }

  async deleteReminder(id: string): Promise<void> {
    const uid = this.auth.user?.uid;
    if (!uid) return;
    await remove(ref(db, `users/${uid}/reminders/${id}`));
  }

  private hashToken(token: string): string {
    let hash = 0;
    for (const ch of token) {
      hash = Math.trunc((hash << 5) - hash + (ch.codePointAt(0) ?? 0));
    }
    return Math.abs(hash).toString(36);
  }
}
