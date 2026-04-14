import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay, tap } from 'rxjs';
import { Biller, BillPayment } from '../models/bill-pay.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { EmailService } from './email.service';
import { MOCK_BILLERS, MOCK_BILL_PAYMENTS } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class BillPayService {
  private auth     = inject(AuthService);
  private storage  = inject(StorageService);
  private emailSvc = inject(EmailService);

  private _billers:  WritableSignal<Biller[]>;
  private _payments: WritableSignal<BillPayment[]>;

  constructor() {
    this._billers  = signal(this.storage.get<Biller[]>('billers')       ?? MOCK_BILLERS);
    this._payments = signal(this.storage.get<BillPayment[]>('bill_payments') ?? MOCK_BILL_PAYMENTS);
    effect(() => { this.storage.set('billers',       this._billers());  });
    effect(() => { this.storage.set('bill_payments', this._payments()); });
  }

  readonly billers = computed<Biller[]>(() => this._billers());

  readonly payments = computed<BillPayment[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._payments();
  });

  readonly scheduled = computed(() => this.payments().filter(p => p.status === 'scheduled'));
  readonly history   = computed(() =>
    this.payments()
      .filter(p => p.status !== 'scheduled')
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
  );

  getBillers(): Observable<Biller[]> { return of(this._billers()).pipe(delay(300)); }
  getPayments(): Observable<BillPayment[]> { return of(this.payments()).pipe(delay(300)); }

  schedulePayment(req: Omit<BillPayment, 'id' | 'confirmationCode'>): Observable<BillPayment> {
    const payment: BillPayment = {
      ...req,
      id: 'bp-' + Date.now(),
      confirmationCode: req.billerName.toUpperCase().replace(/\s+/g, '') + '-' + Date.now(),
    };
    this._payments.update(list => [payment, ...list]);
    return of(payment).pipe(
      delay(800),
      tap(p => {
        const user = this.auth.user();
        if (user?.role === 'user') {
          const currency = 'USD';
          const fmtAmt   = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(p.amount);
          this.emailSvc.sendBillPayConfirmation(user.email, user.firstName, {
            biller:        p.billerName,
            amount:        fmtAmt,
            confirmation:  p.confirmationCode ?? '',
            scheduledDate: p.scheduledDate,
            fromAccount:   p.fromAccountId,
          });
        }
      }),
    );
  }

  completePayment(id: string): void {
    this._payments.update(list => list.map(p =>
      p.id === id ? { ...p, status: 'paid', paidDate: new Date().toISOString() } : p
    ));
  }

  cancelPayment(id: string): void {
    this._payments.update(list => list.map(p =>
      p.id === id ? { ...p, status: 'cancelled' } : p
    ));
  }

  toggleAutopay(billerId: string): void {
    this._billers.update(list => list.map(b =>
      b.id === billerId ? { ...b, autopay: !b.autopay } : b
    ));
  }

  addBiller(biller: Omit<Biller, 'id'>): void {
    this._billers.update(list => [...list, { ...biller, id: 'blr-' + Date.now() }]);
  }
}
