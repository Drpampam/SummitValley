import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { StatementService } from '../../core/services/statement.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../core/services/toast.service';
import { LocaleService } from '../../core/services/locale.service';
import { Statement } from '../../core/models/statement.model';

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatSelectModule,
    MatSlideToggleModule, MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './statements.html',
  styleUrl: './statements.scss',
})
export class StatementsComponent implements OnInit {
  private stmtSvc = inject(StatementService);
  private accSvc  = inject(AccountService);
  private toast   = inject(ToastService);
  private locale  = inject(LocaleService);

  statements   = this.stmtSvc.myStatements;
  eStatement   = this.stmtSvc.eStatementEnabled;
  accounts     = this.accSvc.accounts;
  currency     = this.locale.currencySymbol;
  filterAccId  = signal('');
  downloadingId = signal<string | null>(null);

  filtered = computed(() => {
    const filter = this.filterAccId();
    return filter ? this.statements().filter(s => s.accountId === filter) : this.statements();
  });

  ngOnInit(): void {}

  toggleEStatement(enabled: boolean): void {
    this.stmtSvc.setEStatement(enabled);
    this.toast.success(enabled ? 'Enrolled in paperless statements.' : 'Switched back to paper statements.');
  }

  download(stmt: Statement): void {
    this.downloadingId.set(stmt.id);
    setTimeout(() => {
      this.downloadingId.set(null);
      // simulate a CSV/text download
      const content = `Summit Valley Bank Statement\n${this.stmtSvc.monthName(stmt.month)} ${stmt.year}\nOpening Balance: ${stmt.openingBalance}\nClosing Balance: ${stmt.closingBalance}\nTotal Credits: ${stmt.totalCredits}\nTotal Debits: ${stmt.totalDebits}\nTransactions: ${stmt.transactionCount}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `nexabank-statement-${stmt.year}-${String(stmt.month).padStart(2,'0')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success('Statement downloaded.');
    }, 1200);
  }

  monthName(m: number): string { return this.stmtSvc.monthName(m); }

  accountLabel(id: string): string {
    const a = this.accounts().find(a => a.id === id);
    return a ? `${a.type === 'checking' ? 'Checking' : 'Savings'} ${a.accountNumber}` : id;
  }
}
