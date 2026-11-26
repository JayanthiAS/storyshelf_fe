import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { ApiError } from '../models/api.model';
import { ApiErrorCode } from '../models/enums.model';

const SILENT_CODES: ApiErrorCode[] = ['BOOK_LOCKED', 'BOOK_NOT_RELEASED', 'BOOK_UNAVAILABLE', 'SUBSCRIPTION_REQUIRED', 'SUBMIT_INCOMPLETE', 'FILE_INVALID', 'FILE_TOO_LARGE', 'FILE_TYPE'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const body = err.error as ApiError | undefined;
      const code = body?.code;
      const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message ?? err.message;

      if (err.status === 410 || code === 'USER_DELETED') {
        toast.error('This account has been deleted.');
      } else if (code === 'OTP_INVALID') {
        /* handled in form */
      } else if (!code || !SILENT_CODES.includes(code)) {
        if (err.status !== 401) toast.error(message || 'Something went wrong');
      }

      return throwError(() => err);
    }),
  );
};
