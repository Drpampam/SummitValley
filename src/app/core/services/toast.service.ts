import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snack = inject(MatSnackBar);

  private show(message: string, type: ToastType, duration: number): void {
    this.snack.open(message, '✕', {
      duration,
      panelClass: ['nb-toast', `nb-toast-${type}`],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  success(message: string, duration = 3000): void { this.show(message, 'success', duration); }
  error(message: string, duration = 4000): void   { this.show(message, 'error',   duration); }
  warning(message: string, duration = 3500): void { this.show(message, 'warning', duration); }
  info(message: string, duration = 3000): void    { this.show(message, 'info',    duration); }
}
