import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface EmailPayload {
  type: string;
  to: string;
  name: string;
  data: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private url  = `${environment.apiUrl}/email/send`;

  private send(payload: EmailPayload): void {
    this.http.post(this.url, payload).pipe(
      catchError(err => {
        // Email failures are non-blocking — log and continue
        console.warn('[EmailService] Failed to send email:', err?.error?.error ?? err.message);
        return of(null);
      })
    ).subscribe();
  }

  // ── Login alert ────────────────────────────────────────────────────────────
  sendLoginAlert(to: string, name: string, device?: string): void {
    this.send({
      type: 'login',
      to,
      name,
      data: {
        time:   new Date().toISOString(),
        device: device ?? navigator.userAgent,
      },
    });
  }

  // ── Transfer sent ──────────────────────────────────────────────────────────
  sendTransferConfirmation(
    to: string,
    name: string,
    opts: { amount: string; recipient?: string; fromAccount?: string; reference?: string; isInternal: boolean }
  ): void {
    this.send({
      type: 'transfer',
      to,
      name,
      data: {
        amount:      opts.amount,
        recipient:   opts.recipient ?? 'Your account',
        fromAccount: opts.fromAccount,
        reference:   opts.reference,
        isInternal:  opts.isInternal,
        date:        new Date().toISOString(),
      },
    });
  }

  // ── Transfer blocked ───────────────────────────────────────────────────────
  sendTransferBlocked(
    to: string,
    name: string,
    opts: { amount: string; reason: string }
  ): void {
    this.send({
      type: 'transfer_blocked',
      to,
      name,
      data: {
        amount: opts.amount,
        reason: opts.reason,
        date:   new Date().toISOString(),
      },
    });
  }

  // ── Deposit notification ───────────────────────────────────────────────────
  sendDepositNotification(
    to: string,
    name: string,
    opts: { amount: string; account: string; note?: string; depositedBy?: string }
  ): void {
    this.send({
      type: 'deposit',
      to,
      name,
      data: {
        amount:      opts.amount,
        account:     opts.account,
        note:        opts.note,
        depositedBy: opts.depositedBy ?? 'Summit Valley Bank',
        date:        new Date().toISOString(),
      },
    });
  }

  // ── Welcome / account created ─────────────────────────────────────────────
  sendWelcomeEmail(to: string, name: string, tempPassword: string): void {
    this.send({
      type: 'welcome',
      to,
      name,
      data: { tempPassword },
    });
  }

  // ── Bill payment confirmation ──────────────────────────────────────────────
  sendBillPayConfirmation(
    to: string,
    name: string,
    opts: { biller: string; amount: string; confirmation: string; scheduledDate: string; fromAccount?: string }
  ): void {
    this.send({
      type: 'bill_payment',
      to,
      name,
      data: {
        biller:        opts.biller,
        amount:        opts.amount,
        confirmation:  opts.confirmation,
        scheduledDate: opts.scheduledDate,
        fromAccount:   opts.fromAccount,
      },
    });
  }
}
