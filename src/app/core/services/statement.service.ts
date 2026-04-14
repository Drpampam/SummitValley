import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Statement } from '../models/statement.model';
import { AuthService } from './auth.service';
import { AccountService } from './account.service';
import { StorageService } from './storage.service';
import { MOCK_STATEMENTS } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class StatementService {
  private auth    = inject(AuthService);
  private accSvc  = inject(AccountService);
  private storage = inject(StorageService);

  private _all:        WritableSignal<Statement[]>;
  private _eStatement: WritableSignal<boolean>;

  constructor() {
    this._all        = signal(this.storage.get<Statement[]>('statements')   ?? MOCK_STATEMENTS);
    this._eStatement = signal(this.storage.get<boolean>('estatement_pref') ?? false);
    effect(() => { this.storage.set('statements',     this._all());        });
    effect(() => { this.storage.set('estatement_pref', this._eStatement()); });
  }

  readonly myStatements = computed<Statement[]>(() => {
    const myAccountIds = this.accSvc.accounts().map(a => a.id);
    return this._all()
      .filter(s => myAccountIds.includes(s.accountId))
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  });

  readonly eStatementEnabled = computed(() => this._eStatement());

  getStatements(): Observable<Statement[]> { return of(this.myStatements()).pipe(delay(300)); }

  setEStatement(enabled: boolean): void { this._eStatement.set(enabled); }

  monthName(month: number): string {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  }
}
