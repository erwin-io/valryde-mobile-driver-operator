import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { type ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { authInterceptor } from './core/auth.interceptor';
import { SessionService } from './core/session.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Resume a securely stored session before the first navigation so guards see the real state.
    provideAppInitializer(() => inject(SessionService).restore()),
  ],
};
