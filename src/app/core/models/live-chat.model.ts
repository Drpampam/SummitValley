export type LiveChatStatus = 'pending' | 'active' | 'closed' | 'abandoned';

export interface LiveChatSession {
  id:           string;
  customerId?:  string;   // undefined for guests
  guestName?:   string;
  guestEmail?:  string;
  topic:        string;
  priorContext: string;   // message typed in bot flow
  status:       LiveChatStatus;
  agentId?:     string;
  agentName?:   string;
  openedAt:     string;
  acceptedAt?:  string;
  closedAt?:    string;
}

export interface LiveChatMessage {
  id:          string;
  sessionId:   string;
  senderType:  'customer' | 'agent' | 'system';
  senderId:    string;
  senderName:  string;
  text:        string;
  sentAt:      string;
}
