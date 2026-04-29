export type TicketStatus   = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'normal' | 'urgent';

export interface SupportTicket {
  id:           string;
  caseRef:      string;
  userId?:      string;   // undefined for guest submissions
  guestName?:   string;
  guestEmail?:  string;
  category:     string;
  message:      string;
  priority:     TicketPriority;
  status:       TicketStatus;
  submittedAt:  string;
  resolvedAt?:  string;
  agentNotes?:  string;
}
