import { Injectable, signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppLocale } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private _locale = signal<AppLocale>('en-US');

  readonly locale = this._locale.asReadonly();

  readonly isUS = computed(() => this._locale() === 'en-US');
  readonly isUK = computed(() => this._locale() === 'en-GB');
  readonly isEU = computed(() => this._locale() === 'en-IE');

  readonly currency = computed(() => {
    if (this._locale() === 'en-GB') return 'GBP';
    if (this._locale() === 'en-IE') return 'EUR';
    return 'USD';
  });

  readonly currencySymbol = computed(() => {
    if (this._locale() === 'en-GB') return '£';
    if (this._locale() === 'en-IE') return '€';
    return '$';
  });

  constructor(private translate: TranslateService) {
    const saved = localStorage.getItem('svb_locale') as AppLocale | null;
    const initial: AppLocale = saved ?? 'en-US';
    this._locale.set(initial);
    this.translate.use(initial === 'en-IE' ? 'en-US' : initial); // fall back to en-US translations
  }

  setLocale(locale: AppLocale): void {
    this._locale.set(locale);
    this.translate.use(locale === 'en-IE' ? 'en-US' : locale);
    localStorage.setItem('svb_locale', locale);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this._locale(), {
      style: 'currency',
      currency: this.currency(),
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat(this._locale(), {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(date));
  }

  formatDateShort(date: string | Date): string {
    return new Intl.DateTimeFormat(this._locale()).format(new Date(date));
  }
}
