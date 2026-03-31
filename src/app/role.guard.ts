import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { filter, map, take } from 'rxjs';

export const roleGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ready$.pipe(
    filter((ready): ready is true => ready),
    take(1),
    map(() => {
      if (!authService.isLoggedIn) {
        return router.createUrlTree(['/login-required']);
      }
      if (authService.roles['admin'] === true || authService.roles['user'] === true) {
        return true;
      }
      return router.createUrlTree(['/register']);
    })
  );
};
