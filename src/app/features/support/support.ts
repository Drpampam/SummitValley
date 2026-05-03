import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { DisputeService } from '../../core/services/dispute.service';
import { SupportTicketService } from '../../core/services/support-ticket.service';
import { LiveChatService } from '../../core/services/live-chat.service';
import { LocaleService } from '../../core/services/locale.service';
import { ToastService } from '../../core/services/toast.service';
import { Dispute, DisputeStatus } from '../../core/models/dispute.model';
import { SupportTicket, TicketStatus } from '../../core/models/support-ticket.model';
import { LiveChatSession, LiveChatMessage } from '../../core/models/live-chat.model';
import { Transaction } from '../../core/models/transaction.model';
import { Account } from '../../core/models/account.model';
import { User } from '../../core/models/user.model';

type SupportTab = 'live' | 'customers' | 'tickets' | 'disputes' | 'transactions';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class SupportComponent implements OnInit, OnDestroy {
  private auth        = inject(AuthService);
  private accountSvc  = inject(AccountService);
  private txnSvc      = inject(TransactionService);
  private disputeSvc  = inject(DisputeService);
  private ticketSvc   = inject(SupportTicketService);
  private liveSvc     = inject(LiveChatService);
  localeService       = inject(LocaleService);
  private toast       = inject(ToastService);

  activeTab       = signal<SupportTab>('live');
  customerSearch  = signal('');
  ticketFilter    = signal<TicketStatus | 'all'>('all');
  disputeFilter   = signal<DisputeStatus | 'all'>('all');
  txnSearch       = signal('');
  expandedRow     = signal<string | null>(null);
  resettingPwd    = signal<string | null>(null);

  // ── Live Chat ─────────────────────────────────────────────────────────────
  activeLiveSession  = signal<LiveChatSession | null>(null);
  liveMsgs           = signal<LiveChatMessage[]>([]);
  liveInput          = signal('');
  customerTyping     = signal(false);
  private _unsubSession:       (() => void) | null = null;
  private _unsubQueue:         (() => void) | null = null;
  private _typingTimer:        ReturnType<typeof setTimeout> | null = null;
  private _inactivityTimer:    ReturnType<typeof setTimeout> | null = null;
  /** Agent-side inactivity close: 20 min of no messages ends the session */
  private readonly INACTIVITY_MS = 20 * 60 * 1000;

  readonly pendingLive  = computed(() => this.liveSvc.pendingSessions());
  readonly activeLive   = computed(() => this.liveSvc.activeSessions());
  readonly liveOpenCount = computed(() => this.liveSvc.pendingCount());

  readonly agent = computed(() => this.auth.user());

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) return;
    // Track presence so customers see agents online
    this.liveSvc.subscribeToAgentPresence(user.id, `${user.firstName} ${user.lastName}`);
    // Register with the queue so the channel is always active; toast is handled by shell.ts
    this._unsubQueue = this.liveSvc.subscribeToQueue(() => {}, () => {});
  }

  ngOnDestroy(): void {
    if (this._typingTimer)     clearTimeout(this._typingTimer);
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    // Close active session before channels are torn down so the broadcast reaches the customer
    const session = this.activeLiveSession();
    if (session) this.liveSvc.closeSession(session.id);
    this._unsubQueue?.();
    this._unsubSession?.();
  }

  // ── Live Chat methods ─────────────────────────────────────────────────────

  acceptLiveSession(session: LiveChatSession): void {
    const user = this.auth.user();
    if (!user) return;
    const accepted = this.liveSvc.acceptSession(session.id, user.id, `${user.firstName} ${user.lastName}`);
    if (!accepted) return;

    // Unsubscribe from previous session if any
    this._unsubSession?.();

    this.activeLiveSession.set(accepted);
    this.liveMsgs.set(this.liveSvc.getMessages(accepted.id));
    this.liveInput.set('');
    this.customerTyping.set(false);
    this.activeTab.set('live');

    this._unsubSession = this.liveSvc.subscribeToSession(
      accepted.id,
      (msg) => {
        this.liveMsgs.update(list => [...list, msg]);
        this._resetInactivity();
        this._scrollLiveBottom();
      },
      (updated) => {
        this.activeLiveSession.set(updated.status === 'active' ? updated : null);
        if (updated.status === 'closed' || updated.status === 'abandoned') {
          if (this._inactivityTimer) { clearTimeout(this._inactivityTimer); this._inactivityTimer = null; }
          this.toast.info('Customer ended the chat.');
          this.activeLiveSession.set(null);
        }
      },
      (userId, typing) => {
        const customerId = accepted.customerId ?? 'guest';
        if (userId !== user.id && userId !== customerId + '_agent') {
          this.customerTyping.set(typing);
          if (typing) {
            if (this._typingTimer) clearTimeout(this._typingTimer);
            this._typingTimer = setTimeout(() => this.customerTyping.set(false), 5000);
          }
        }
      },
    );
    this._startInactivity();
    this.toast.success(`You are now chatting with ${this._resolveCustomerName(accepted.customerId) || accepted.guestName || 'the customer'}`);
  }

  onLiveInput(e: Event): void {
    const val = (e.target as HTMLTextAreaElement).value;
    this.liveInput.set(val);
    const session = this.activeLiveSession();
    const user    = this.auth.user();
    if (!session || !user) return;
    this.liveSvc.broadcastTyping(session.id, user.id, val.length > 0);
    if (this._typingTimer) clearTimeout(this._typingTimer);
    this._typingTimer = setTimeout(() =>
      this.liveSvc.broadcastTyping(session.id, user.id, false), 3000
    );
  }

  onLiveKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendAgentMessage(); }
  }

  sendAgentMessage(): void {
    const text    = this.liveInput().trim();
    const session = this.activeLiveSession();
    const user    = this.auth.user();
    if (!text || !session || !user) return;

    const msg = this.liveSvc.addMessage({
      sessionId:  session.id,
      senderType: 'agent',
      senderId:   user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      text,
    });
    this.liveMsgs.update(list => [...list, msg]);
    this.liveInput.set('');
    if (this._typingTimer) clearTimeout(this._typingTimer);
    this.liveSvc.broadcastTyping(session.id, user.id, false);
    this._resetInactivity();
    this._scrollLiveBottom();
  }

  closeLiveSession(): void {
    if (this._inactivityTimer) { clearTimeout(this._inactivityTimer); this._inactivityTimer = null; }
    const session = this.activeLiveSession();
    if (session) this.liveSvc.closeSession(session.id);
    this._unsubSession?.();
    this._unsubSession = null;
    this.activeLiveSession.set(null);
    this.liveMsgs.set([]);
    this.toast.info('Live chat session closed.');
  }

  liveCustomerName(session: LiveChatSession): string {
    return session.guestName ?? this._resolveCustomerName(session.customerId) ?? 'Customer';
  }

  liveCustomerInitials(session: LiveChatSession): string {
    const name = this.liveCustomerName(session);
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  liveWaitTime(openedAt: string): string {
    const mins = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000);
    return mins < 1 ? 'Just now' : `${mins}m ago`;
  }

  private _startInactivity(): void {
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), this.INACTIVITY_MS);
  }

  private _resetInactivity(): void {
    if (this.activeLiveSession()) this._startInactivity();
  }

  private _onInactivityTimeout(): void {
    this._inactivityTimer = null;
    if (!this.activeLiveSession()) return;
    this.toast.info('Session closed: 20 minutes without activity.');
    this.closeLiveSession();
  }

  private _resolveCustomerName(customerId?: string): string {
    if (!customerId) return '';
    const u = this.auth.allUsersReactive().find(u => u.id === customerId);
    return u ? `${u.firstName} ${u.lastName}` : customerId;
  }

  private _scrollLiveBottom(): void {
    setTimeout(() => {
      const el = document.querySelector('.live-chat-msgs');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  readonly stats = computed(() => {
    const disputes = this.disputeSvc.allDisputes();
    const tickets  = this.ticketSvc.allTickets();
    const open     = disputes.filter(d => d.status === 'submitted' || d.status === 'under_review').length;
    const today    = new Date().toISOString().slice(0, 10);
    const resolved = disputes.filter(d => d.resolvedAt?.startsWith(today)).length;
    const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    return {
      customers:    this.customers().length,
      openTickets,
      openDisputes: open,
      resolvedToday: resolved,
      totalDisputes: disputes.length,
    };
  });

  // ── Customers ─────────────────────────────────────────────────────────────

  readonly customers = computed<User[]>(() =>
    this.auth.allUsersReactive().filter(u => u.role === 'user')
  );

  readonly filteredCustomers = computed<User[]>(() => {
    const q = this.customerSearch().toLowerCase().trim();
    if (!q) return this.customers();
    return this.customers().filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    );
  });

  accountsFor(userId: string): Account[] {
    return this.accountSvc.getAccountsByUserId(userId);
  }

  totalBalance(userId: string): number {
    return this.accountsFor(userId).reduce((s, a) => s + a.balance, 0);
  }

  primaryCurrency(userId: string): string {
    return this.accountsFor(userId)[0]?.currency ?? 'USD';
  }

  initials(u: User): string {
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  toggleRow(id: string): void {
    this.expandedRow.set(this.expandedRow() === id ? null : id);
  }

  resetPassword(user: User): void {
    this.resettingPwd.set(user.id);
    try {
      this.auth.adminResetPassword(user.id);
      this.toast.success(`Password reset email sent to ${user.email}`);
    } catch {
      this.toast.error('Failed to reset password. Please try again.');
    } finally {
      this.resettingPwd.set(null);
    }
  }

  // ── Support Tickets ───────────────────────────────────────────────────────

  readonly allTickets = computed<SupportTicket[]>(() => this.ticketSvc.allTickets());

  readonly filteredTickets = computed<SupportTicket[]>(() => {
    const f   = this.ticketFilter();
    const all = this.allTickets();
    return f === 'all' ? all : all.filter(t => t.status === f);
  });

  readonly ticketCounts = computed(() => {
    const all = this.allTickets();
    return {
      all:         all.length,
      open:        all.filter(t => t.status === 'open').length,
      in_progress: all.filter(t => t.status === 'in_progress').length,
      resolved:    all.filter(t => t.status === 'resolved').length,
      closed:      all.filter(t => t.status === 'closed').length,
    };
  });

  ticketSubmitterName(t: SupportTicket): string {
    if (t.userId) return this.getUserName(t.userId);
    return t.guestName ?? 'Guest';
  }

  ticketSubmitterEmail(t: SupportTicket): string {
    if (t.userId) return this.getUserById(t.userId)?.email ?? '';
    return t.guestEmail ?? '';
  }

  updateTicketStatus(t: SupportTicket, status: TicketStatus): void {
    this.ticketSvc.updateStatus(t.id, status);
    this.toast.success(`${t.caseRef} updated to "${this.ticketStatusLabel(status)}".`);
  }

  ticketStatusLabel(status: string): string {
    const map: Record<string, string> = {
      open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
    };
    return map[status] ?? status;
  }

  ticketStatusClass(status: string): string {
    const map: Record<string, string> = {
      open: 'badge-blue', in_progress: 'badge-amber', resolved: 'badge-green', closed: 'badge-red',
    };
    return map[status] ?? '';
  }

  ticketPriorityClass(priority: string): string {
    return priority === 'urgent' ? 'badge-red' : 'badge-green';
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  readonly allDisputes = computed<Dispute[]>(() => this.disputeSvc.allDisputes());

  readonly filteredDisputes = computed<Dispute[]>(() => {
    const filter = this.disputeFilter();
    const all    = this.allDisputes();
    return filter === 'all' ? all : all.filter(d => d.status === filter);
  });

  readonly disputeCounts = computed(() => {
    const all = this.allDisputes();
    return {
      all:          all.length,
      submitted:    all.filter(d => d.status === 'submitted').length,
      under_review: all.filter(d => d.status === 'under_review').length,
      resolved:     all.filter(d => d.status === 'resolved').length,
      rejected:     all.filter(d => d.status === 'rejected').length,
    };
  });

  updateStatus(d: Dispute, status: DisputeStatus): void {
    this.disputeSvc.updateDisputeStatus(d.id, status);
    this.toast.success(`${d.caseNumber} updated to "${this.statusLabel(status)}".`);
  }

  getDisputeTransaction(transactionId: string): Transaction | undefined {
    return this.txnSvc.allTransactions.find(t => t.id === transactionId);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  readonly filteredTransactions = computed<Transaction[]>(() => {
    const q    = this.txnSearch().toLowerCase().trim();
    const txns = this.txnSvc.transactions();   // reactive — returns all for CS role
    const sorted = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!q) return sorted;
    return sorted.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (t.reference ?? '').toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.accountId.toLowerCase().includes(q)
    );
  });

  // ── Shared helpers ────────────────────────────────────────────────────────

  getUserById(id: string): User | undefined {
    return this.auth.allUsersReactive().find(u => u.id === id);
  }

  getUserName(userId: string): string {
    const u = this.getUserById(userId);
    return u ? `${u.firstName} ${u.lastName}` : userId;
  }

  getAccountOwner(accountId: string): string {
    const acc = this.accountsFor('').length > 0 ? undefined : undefined;
    void acc;
    const all = this.auth.allUsersReactive();
    for (const user of all) {
      if (this.accountSvc.getAccountsByUserId(user.id).some(a => a.id === accountId)) {
        return `${user.firstName} ${user.lastName}`;
      }
    }
    return accountId;
  }

  fmt(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
      style: 'currency', currency,
    }).format(amount);
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      submitted: 'Submitted', under_review: 'Under Review',
      resolved: 'Resolved', rejected: 'Rejected',
      completed: 'Completed', pending: 'Pending', failed: 'Failed',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      submitted: 'badge-blue', under_review: 'badge-amber',
      resolved: 'badge-green', rejected: 'badge-red',
      completed: 'badge-green', pending: 'badge-purple', failed: 'badge-red',
    };
    return map[status] ?? '';
  }

  reasonLabel(reason: string): string {
    const map: Record<string, string> = {
      unauthorized: 'Unauthorized', duplicate: 'Duplicate',
      incorrect_amount: 'Wrong Amount', merchant_error: 'Merchant Error',
      not_received: 'Not Received', other: 'Other',
    };
    return map[reason] ?? reason;
  }

  flagEmoji(country: string): string {
    return country === 'GB' ? '🇬🇧' : country === 'IE' ? '🇪🇺' : '🇺🇸';
  }
}
