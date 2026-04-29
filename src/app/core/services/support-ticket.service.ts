import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { SupportTicket, TicketStatus, TicketPriority } from '../models/support-ticket.model';

@Injectable({ providedIn: 'root' })
export class SupportTicketService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _all: WritableSignal<SupportTicket[]>;

  constructor() {
    this._all = signal(this.storage.get<SupportTicket[]>('support_tickets') ?? []);
    effect(() => { this.storage.set('support_tickets', this._all()); });
  }

  readonly allTickets = computed<SupportTicket[]>(() =>
    [...this._all()].sort((a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
  );

  readonly myTickets = computed<SupportTicket[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._all().filter(t => t.userId === user.id);
  });

  create(data: {
    userId?:      string;
    guestName?:   string;
    guestEmail?:  string;
    category:     string;
    message:      string;
    priority:     TicketPriority;
    caseRef:      string;
  }): void {
    const ticket: SupportTicket = {
      id:          'tkt-' + Date.now(),
      caseRef:     data.caseRef,
      userId:      data.userId,
      guestName:   data.guestName,
      guestEmail:  data.guestEmail,
      category:    data.category,
      message:     data.message,
      priority:    data.priority,
      status:      'open',
      submittedAt: new Date().toISOString(),
    };
    this._all.update(list => [ticket, ...list]);
  }

  updateStatus(id: string, status: TicketStatus, notes?: string): void {
    this._all.update(list =>
      list.map(t => t.id === id
        ? {
            ...t,
            status,
            resolvedAt: (status === 'resolved' || status === 'closed')
              ? new Date().toISOString()
              : t.resolvedAt,
            agentNotes: notes ?? t.agentNotes,
          }
        : t
      )
    );
  }
}
