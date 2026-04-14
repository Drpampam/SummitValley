import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { TitleCasePipe } from '@angular/common';
import { TransactionService } from '../../core/services/transaction.service';
import { LocaleService } from '../../core/services/locale.service';
import { Transaction } from '../../core/models/transaction.model';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatPaginatorModule,
    TitleCasePipe,
    TranslateModule,
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class TransactionsComponent implements OnInit {
  private fb = inject(FormBuilder);
  txnService    = inject(TransactionService);
  localeService = inject(LocaleService);

  allTransactions = signal<Transaction[]>([]);
  pageIndex = signal(0);
  pageSize  = signal(10);


  filterForm = this.fb.group({
    search:   [''],
    type:     ['all'],
    dateFrom: [null as Date | null],
    dateTo:   [null as Date | null],
  });

  filteredTransactions = computed(() => {
    const { search, type, dateFrom, dateTo } = this.filterForm.value;
    return this.allTransactions().filter((t) => {
      const matchSearch = !search ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());
      const matchType = type === 'all' || t.type === type;
      const d = new Date(t.date);
      const matchFrom = !dateFrom || d >= new Date(dateFrom);
      const matchTo   = !dateTo   || d <= new Date(dateTo);
      return matchSearch && matchType && matchFrom && matchTo;
    });
  });

  paginatedTransactions = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredTransactions().slice(start, start + this.pageSize());
  });

  totalCredit = computed(() =>
    this.filteredTransactions().filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  );
  totalDebit = computed(() =>
    this.filteredTransactions().filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
  );
  netFlow = computed(() => this.totalCredit() - this.totalDebit());

  ngOnInit(): void {
    this.txnService.getTransactions().subscribe((txns) => this.allTransactions.set(txns));
    this.filterForm.valueChanges.subscribe(() => this.pageIndex.set(0));
  }

  onPageChange(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  clearFilters(): void {
    this.filterForm.reset({ search: '', type: 'all', dateFrom: null, dateTo: null });
  }

  exportCsv(): void {
    const rows = this.filteredTransactions();
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Balance', 'Status'];
    const csv = [
      headers.join(','),
      ...rows.map((t) => [
        this.localeService.formatDate(t.date),
        `"${t.description}"`,
        t.category, t.type, t.amount, t.balance, t.status,
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'summit-valley-bank-transactions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  fmt(amount: number): string { return this.localeService.formatCurrency(amount); }

  // Split date into two lines: "06 Apr" + "2024"
  fmtDatePrimary(date: string): string {
    return new Intl.DateTimeFormat(this.localeService.locale(), { day: '2-digit', month: 'short' }).format(new Date(date));
  }
  fmtDateYear(date: string): string {
    return new Intl.DateTimeFormat(this.localeService.locale(), { year: 'numeric' }).format(new Date(date));
  }
  fmtDate(date: string): string { return this.localeService.formatDate(date); }

  categoryIcon(cat: string): string {
    const m: Record<string, string> = {
      salary: 'work', groceries: 'shopping_cart', utilities: 'bolt',
      dining: 'restaurant', shopping: 'local_mall', transfer: 'swap_horiz',
      deposit: 'add_circle', withdrawal: 'remove_circle', payment: 'payment', other: 'more_horiz',
    };
    return m[cat] ?? 'more_horiz';
  }

  categoryColor(cat: string): string {
    const m: Record<string, string> = {
      salary: '#8b5cf6', groceries: '#16a34a', utilities: '#0891b2',
      dining: '#f59e0b', shopping: '#ec4899', transfer: '#6366f1',
      deposit: '#10b981', withdrawal: '#ef4444', payment: '#64748b', other: '#94a3b8',
    };
    return m[cat] ?? '#94a3b8';
  }
}
