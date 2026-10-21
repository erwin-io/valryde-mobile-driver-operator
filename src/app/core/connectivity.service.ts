import { DestroyRef, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineState = signal(globalThis.navigator?.onLine ?? true);
  readonly online = this.onlineState.asReadonly();

  constructor() {
    if (!globalThis.window) return;
    const setOnline = () => this.onlineState.set(true);
    const setOffline = () => this.onlineState.set(false);
    globalThis.window.addEventListener('online', setOnline);
    globalThis.window.addEventListener('offline', setOffline);
    inject(DestroyRef).onDestroy(() => {
      globalThis.window.removeEventListener('online', setOnline);
      globalThis.window.removeEventListener('offline', setOffline);
    });
  }
}
