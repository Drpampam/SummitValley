import { Component, inject, signal, ViewChild, ElementRef, afterNextRender, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { EmailService } from '../../../core/services/email.service';
import { SupportTicketService } from '../../../core/services/support-ticket.service';
import { LiveChatService } from '../../../core/services/live-chat.service';
import { LiveChatMessage, LiveChatSession } from '../../../core/models/live-chat.model';

type ChatStep =
  | 'greeting'
  | 'message'
  | 'contact_info'
  | 'priority'
  | 'submitting'
  | 'done'
  | 'live_request'
  | 'live_waiting'
  | 'live_chat';

interface Msg { from: 'bot' | 'user'; text: string; }

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './chat-widget.html',
  styleUrl:    './chat-widget.scss',
})
export class ChatWidgetComponent implements OnDestroy {
  private auth       = inject(AuthService);
  private emailSvc   = inject(EmailService);
  private ticketSvc  = inject(SupportTicketService);
  private liveChatSvc = inject(LiveChatService);

  @ViewChild('msgList')     private msgList!:    ElementRef<HTMLElement>;
  @ViewChild('liveList')    private liveList!:   ElementRef<HTMLElement>;
  @ViewChild('liveMsgInput') private liveMsgInput!: ElementRef<HTMLTextAreaElement>;

  isOpen     = signal(false);
  step       = signal<ChatStep>('greeting');
  messages   = signal<Msg[]>([]);
  isTyping   = signal(false);
  inputText  = signal('');
  caseRef    = signal('');
  guestName  = signal('');
  guestEmail = signal('');

  // Live chat state
  liveSession    = signal<LiveChatSession | null>(null);
  liveMessages   = signal<LiveChatMessage[]>([]);
  liveInput      = signal('');
  agentTyping    = signal(false);
  onlineAgents   = this.liveChatSvc.onlineAgentCount;

  private _topic    = '';
  private _message  = '';
  private _unsubSession: (() => void) | null = null;
  private _typingTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isGuest = () => !this.auth.isAuthenticated();

  readonly topics = [
    { label: 'Account Issue',    icon: 'account_balance_wallet' },
    { label: 'Transfer Problem', icon: 'compare_arrows' },
    { label: 'Card Issue',       icon: 'credit_card' },
    { label: 'Billing Query',    icon: 'receipt' },
    { label: 'Technical Help',   icon: 'build' },
    { label: 'General Inquiry',  icon: 'chat_bubble' },
  ];

  constructor() {
    afterNextRender(() => this._scrollBottom());
  }

  ngOnDestroy(): void {
    this._unsubSession?.();
    if (this._typingTimer) clearTimeout(this._typingTimer);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
      if (this.messages().length === 0) this._start();
    }
  }

  private _start(): void {
    const name = this.auth.user()?.firstName ?? 'there';
    const greeting = this.isGuest()
      ? `👋 Hi there! I'm SVB Assistant — here to help before you even log in.`
      : `👋 Hi ${name}! I'm your SVB Assistant.`;
    setTimeout(() => {
      this.messages.update(m => [...m, { from: 'bot', text: greeting }]);
      this._botReply(`I'm here to help with any questions or issues. Which topic best describes what you need?`, 900);
    }, 250);
  }

  private _botReply(text: string, delay = 900): void {
    this.isTyping.set(true);
    setTimeout(() => {
      this.isTyping.set(false);
      this.messages.update(m => [...m, { from: 'bot', text }]);
    }, delay);
  }

  private _scrollBottom(): void {
    setTimeout(() => {
      if (this.msgList?.nativeElement)
        this.msgList.nativeElement.scrollTop = this.msgList.nativeElement.scrollHeight;
    }, 50);
  }

  private _scrollLiveBottom(): void {
    setTimeout(() => {
      if (this.liveList?.nativeElement)
        this.liveList.nativeElement.scrollTop = this.liveList.nativeElement.scrollHeight;
    }, 50);
  }

  selectTopic(topic: { label: string }): void {
    this._topic = topic.label;
    this.messages.update(m => [...m, { from: 'user', text: topic.label }]);
    this.step.set('message');
    this._botReply(`Got it! Please describe your issue in as much detail as you can:`);
    this._scrollBottom();
  }

  onInput(e: Event): void {
    this.inputText.set((e.target as HTMLTextAreaElement).value);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    if (text.length < 5) return;
    this._message = text;
    this.messages.update(m => [...m, { from: 'user', text }]);
    this.inputText.set('');
    this._scrollBottom();

    if (this.isGuest()) {
      this.step.set('contact_info');
      this._botReply(`Thanks for the details! So I can follow up, could you share your name and email?`);
    } else {
      this.step.set('priority');
      this._botReply(`Thanks for the details! One last thing — how urgent is this?`);
    }
  }

  onGuestNameInput(e: Event): void {
    this.guestName.set((e.target as HTMLInputElement).value);
  }

  onGuestEmailInput(e: Event): void {
    this.guestEmail.set((e.target as HTMLInputElement).value);
  }

  submitContactInfo(): void {
    const name  = this.guestName().trim();
    const email = this.guestEmail().trim();
    if (!name || !email || !email.includes('@')) return;
    this.messages.update(m => [...m, { from: 'user', text: `${name} · ${email}` }]);
    this.step.set('priority');
    this._botReply(`Thanks, ${name.split(' ')[0]}! Last question — how urgent is this?`);
    this._scrollBottom();
  }

  selectPriority(priority: 'normal' | 'urgent'): void {
    const label = priority === 'urgent' ? '🔴 Urgent' : '🟢 Normal';
    this.messages.update(m => [...m, { from: 'user', text: label }]);
    this.step.set('submitting');
    this._botReply(`Sending your request to our support team now…`, 500);
    this._scrollBottom();

    const user  = this.auth.user();
    const name  = user ? `${user.firstName} ${user.lastName}` : this.guestName();
    const email = user?.email ?? this.guestEmail();
    const ref   = 'SVB-' + Date.now().toString(36).toUpperCase();
    this.caseRef.set(ref);

    this.ticketSvc.create({
      userId:     user?.id,
      guestName:  user ? undefined : this.guestName(),
      guestEmail: user ? undefined : this.guestEmail(),
      category:   this._topic,
      message:    this._message,
      priority,
      caseRef:    ref,
    });

    this.emailSvc.sendContactRequest(email, name, {
      category: this._topic,
      subject:  this._topic,
      priority,
      message:  this._message,
    });

    setTimeout(() => {
      this.isTyping.set(false);
      const sla = priority === 'urgent' ? '4 business hours' : '1–2 business days';
      this.messages.update(m => [...m,
        { from: 'bot', text: `✅ All done! A confirmation has been sent to your email.` },
        { from: 'bot', text: `Case reference: ${ref}\nWe'll get back to you within ${sla}.` },
      ]);
      this.step.set('done');
      this._scrollBottom();
    }, 2400);
  }

  // ── Live Agent Flow ───────────────────────────────────────────────────────

  requestLiveAgent(): void {
    this.step.set('live_request');
    this._scrollBottom();
  }

  confirmLiveAgent(): void {
    const user = this.auth.user();
    const name  = user ? `${user.firstName} ${user.lastName}` : this.guestName();
    const email = user?.email ?? this.guestEmail();

    const session = this.liveChatSvc.createSession({
      customerId:   user?.id,
      guestName:    user ? undefined : (name || 'Guest'),
      guestEmail:   user ? undefined : email,
      topic:        this._topic || 'General',
      priorContext: this._message || '',
    });

    this.liveSession.set(session);
    this.liveMessages.set([]);
    this.step.set('live_waiting');
    this._scrollBottom();

    // Subscribe to this session's channel
    this._unsubSession = this.liveChatSvc.subscribeToSession(
      session.id,
      (msg) => {
        // Only add messages from the other side
        if (msg.senderType !== 'customer') {
          this.liveMessages.update(list => [...list, msg]);
          this._scrollLiveBottom();
        }
      },
      (updated) => {
        this.liveSession.set(updated);
        if (updated.status === 'active' && this.step() === 'live_waiting') {
          this.step.set('live_chat');
          this._scrollLiveBottom();
        }
        if (updated.status === 'closed') {
          this.step.set('done');
          this.caseRef.set(updated.id.slice(4, 12).toUpperCase());
        }
      },
      (userId, typing) => {
        if (userId !== (user?.id ?? 'guest')) {
          this.agentTyping.set(typing);
          if (typing) {
            setTimeout(() => this.agentTyping.set(false), 5000);
          }
        }
      },
    );
  }

  cancelLiveAgent(): void {
    this._unsubSession?.();
    this._unsubSession = null;
    const session = this.liveSession();
    if (session) this.liveChatSvc.closeSession(session.id);
    this.liveSession.set(null);
    this.step.set(this._message ? 'priority' : 'greeting');
    this._scrollBottom();
  }

  onLiveInput(e: Event): void {
    const val = (e.target as HTMLTextAreaElement).value;
    this.liveInput.set(val);
    const session = this.liveSession();
    if (!session) return;
    const user = this.auth.user();
    const uid  = user?.id ?? 'guest';
    this.liveChatSvc.broadcastTyping(session.id, uid, val.length > 0);
    if (this._typingTimer) clearTimeout(this._typingTimer);
    this._typingTimer = setTimeout(() =>
      this.liveChatSvc.broadcastTyping(session.id, uid, false), 3000
    );
  }

  onLiveKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendLiveMessage(); }
  }

  sendLiveMessage(): void {
    const text = this.liveInput().trim();
    if (!text || !this.liveSession()) return;
    const user     = this.auth.user();
    const session  = this.liveSession()!;
    const senderId = user?.id ?? 'guest';
    const name     = user ? `${user.firstName} ${user.lastName}` : (this.guestName() || 'Guest');

    const msg = this.liveChatSvc.addMessage({
      sessionId:  session.id,
      senderType: 'customer',
      senderId,
      senderName: name,
      text,
    });
    this.liveMessages.update(list => [...list, msg]);
    this.liveInput.set('');
    if (this._typingTimer) clearTimeout(this._typingTimer);
    this.liveChatSvc.broadcastTyping(session.id, senderId, false);
    this._scrollLiveBottom();
  }

  endLiveChat(): void {
    const session = this.liveSession();
    if (session) this.liveChatSvc.closeSession(session.id);
    this._unsubSession?.();
    this._unsubSession = null;
    this.step.set('done');
    this.caseRef.set(session?.id.slice(4, 12).toUpperCase() ?? '');
    this._scrollBottom();
  }

  startOver(): void {
    this._unsubSession?.();
    this._unsubSession = null;
    this.messages.set([]);
    this.step.set('greeting');
    this.inputText.set('');
    this._topic      = '';
    this._message    = '';
    this.caseRef.set('');
    this.guestName.set('');
    this.guestEmail.set('');
    this.liveSession.set(null);
    this.liveMessages.set([]);
    this.liveInput.set('');
    this._start();
  }
}
