import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

let refreshing = false;

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
        return throwError(() => err);
      }
      if (refreshing) return throwError(() => err);
      refreshing = true;
      return auth.refresh().pipe(
        switchMap(() => {
          refreshing = false;
          const token = auth.getAccessToken();
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
        }),
        catchError((refreshErr) => {
          refreshing = false;
          auth.clearSession();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
