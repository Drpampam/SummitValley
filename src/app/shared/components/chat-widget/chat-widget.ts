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

/** How long a pending session waits before auto-abandoning (ms) */
const PENDING_TIMEOUT_MS    = 5 * 60 * 1000;  // 5 min
/** How long an active chat can be silent before auto-closing (ms) */
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 min

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './chat-widget.html',
  styleUrl:    './chat-widget.scss',
})
export class ChatWidgetComponent implements OnDestroy {
  private auth         = inject(AuthService);
  private emailSvc     = inject(EmailService);
  private ticketSvc    = inject(SupportTicketService);
  private liveChatSvc  = inject(LiveChatService);

  @ViewChild('msgList')      private msgList!:     ElementRef<HTMLElement>;
  @ViewChild('liveList')     private liveList!:    ElementRef<HTMLElement>;
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
  liveSession  = signal<LiveChatSession | null>(null);
  liveMessages = signal<LiveChatMessage[]>([]);
  liveInput    = signal('');
  agentTyping  = signal(false);
  onlineAgents = this.liveChatSvc.onlineAgentCount;

  private _topic    = '';
  private _message  = '';
  private _unsubSession:      (() => void) | null = null;
  private _unsubCustomerQueue: (() => void) | null = null;
  private _typingTimer:    ReturnType<typeof setTimeout> | null = null;
  private _pendingTimer:   ReturnType<typeof setTimeout> | null = null;
  private _inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tracks all bot-reply/delay timeouts so they can be cancelled on destroy */
  private _pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

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
    this._clearAllTimers();
    // Close/abandon BEFORE unsubscribing so the broadcast can go through
    const session = this.liveSession();
    if (session?.status === 'active')  this.liveChatSvc.closeSession(session.id);
    if (session?.status === 'pending') this.liveChatSvc.abandonSession(session.id);
    this._unsubSession?.();
    this._unsubCustomerQueue?.();
  }

  private _clearAllTimers(): void {
    if (this._typingTimer)    { clearTimeout(this._typingTimer);    this._typingTimer    = null; }
    if (this._pendingTimer)   { clearTimeout(this._pendingTimer);   this._pendingTimer   = null; }
    if (this._inactivityTimer){ clearTimeout(this._inactivityTimer);this._inactivityTimer = null; }
    this._pendingTimeouts.forEach(t => clearTimeout(t));
    this._pendingTimeouts = [];
  }

  // ── Tracked timeout helpers ───────────────────────────────────────────────

  private _setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    const t = setTimeout(() => {
      this._pendingTimeouts = this._pendingTimeouts.filter(x => x !== t);
      fn();
    }, ms);
    this._pendingTimeouts.push(t);
    return t;
  }

  // ── Widget open/close ─────────────────────────────────────────────────────

  toggle(): void {
    if (this.isOpen()) {
      // Cancel pending live request when customer hides the widget
      if (this.step() === 'live_waiting') {
        this.cancelLiveAgent();
      }
      this.isOpen.set(false);
    } else {
      this.isOpen.set(true);
      if (this.messages().length === 0) this._start();
    }
  }

  // ── Bot flow ──────────────────────────────────────────────────────────────

  private _start(): void {
    const name = this.auth.user()?.firstName ?? 'there';
    const greeting = this.isGuest()
      ? `👋 Hi there! I'm SVB Assistant — here to help before you even log in.`
      : `👋 Hi ${name}! I'm your SVB Assistant.`;
    this._setTimeout(() => {
      this.messages.update(m => [...m, { from: 'bot', text: greeting }]);
      this._botReply(`I'm here to help with any questions or issues. Which topic best describes what you need?`, 900);
    }, 250);
  }

  private _botReply(text: string, delay = 900): void {
    this.isTyping.set(true);
    this._setTimeout(() => {
      this.isTyping.set(false);
      this.messages.update(m => [...m, { from: 'bot', text }]);
    }, delay);
  }

  private _scrollBottom(): void {
    this._setTimeout(() => {
      if (this.msgList?.nativeElement)
        this.msgList.nativeElement.scrollTop = this.msgList.nativeElement.scrollHeight;
    }, 50);
  }

  private _scrollLiveBottom(): void {
    this._setTimeout(() => {
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

    this._setTimeout(() => {
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

  declineLiveAgent(): void {
    // Return to the step the user came from rather than always going to greeting
    if (this._message)     this.step.set('priority');
    else if (this._topic)  this.step.set('message');
    else                   this.step.set('greeting');
    this._scrollBottom();
  }

  confirmLiveAgent(): void {
    const user  = this.auth.user();
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

    // Start pending timeout — if no agent accepts within 5 min, auto-abandon
    this._startPendingTimeout();

    this._unsubSession = this.liveChatSvc.subscribeToSession(
      session.id,
      (msg) => {
        if (msg.senderType !== 'customer') {
          this.liveMessages.update(list => [...list, msg]);
          this._resetInactivityTimer();
          this._scrollLiveBottom();
        }
      },
      (updated) => {
        this.liveSession.set(updated);
        if (updated.status === 'active' && this.step() === 'live_waiting') {
          if (this._pendingTimer) { clearTimeout(this._pendingTimer); this._pendingTimer = null; }
          this.step.set('live_chat');
          this._startInactivityTimer();
          this._scrollLiveBottom();
        }
        if (updated.status === 'closed' || updated.status === 'abandoned') {
          this._clearLiveTimers();
          this.step.set('done');
          this.caseRef.set(updated.id.slice(4, 12).toUpperCase());
          this._scrollBottom();
        }
      },
      (userId, typing) => {
        if (userId !== (user?.id ?? 'guest')) {
          this.agentTyping.set(typing);
          if (typing) {
            this._setTimeout(() => this.agentTyping.set(false), 5000);
          }
        }
      },
    );

    // Subscribe to the queue channel so the agent's accept broadcast reaches us cross-device
    this._unsubCustomerQueue = this.liveChatSvc.subscribeCustomerToQueue(
      session.id,
      (updated) => {
        this.liveSession.set(updated);
        if (updated.status === 'active' && this.step() === 'live_waiting') {
          if (this._pendingTimer) { clearTimeout(this._pendingTimer); this._pendingTimer = null; }
          this.step.set('live_chat');
          this._startInactivityTimer();
          this._scrollLiveBottom();
        }
        if (updated.status === 'closed' || updated.status === 'abandoned') {
          this._clearLiveTimers();
          this.step.set('done');
          this.caseRef.set(updated.id.slice(4, 12).toUpperCase());
          this._scrollBottom();
        }
      },
    );
  }

  cancelLiveAgent(): void {
    this._clearLiveTimers();
    // Abandon BEFORE unsubscribing so the broadcast goes through
    const session = this.liveSession();
    if (session) this.liveChatSvc.abandonSession(session.id);
    this._unsubSession?.();
    this._unsubSession = null;
    this._unsubCustomerQueue?.();
    this._unsubCustomerQueue = null;
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
    this._resetInactivityTimer();
    this._scrollLiveBottom();
  }

  endLiveChat(): void {
    this._clearLiveTimers();
    const session = this.liveSession();
    if (session) this.liveChatSvc.closeSession(session.id);
    this._unsubSession?.();
    this._unsubSession = null;
    this._unsubCustomerQueue?.();
    this._unsubCustomerQueue = null;
    this.step.set('done');
    this.caseRef.set(session?.id.slice(4, 12).toUpperCase() ?? '');
    this._scrollBottom();
  }

  startOver(): void {
    this._clearLiveTimers();
    this._unsubSession?.();
    this._unsubSession = null;
    this._unsubCustomerQueue?.();
    this._unsubCustomerQueue = null;
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

  // ── Session timeout management ────────────────────────────────────────────

  private _startPendingTimeout(): void {
    if (this._pendingTimer) clearTimeout(this._pendingTimer);
    this._pendingTimer = setTimeout(() => this._onPendingTimeout(), PENDING_TIMEOUT_MS);
  }

  private _onPendingTimeout(): void {
    this._pendingTimer = null;
    if (this.step() !== 'live_waiting') return;
    const session = this.liveSession();
    if (session) {
      this.liveChatSvc.abandonSession(session.id);
      this._unsubSession?.();
      this._unsubSession = null;
    }
    this.liveSession.set(null);
    // Offer ticket fallback in the bot conversation
    this.messages.update(m => [...m, {
      from: 'bot' as const,
      text: `⏱️ No agents are available right now. Your request has been queued — we'll create a support ticket so the team can follow up with you.`,
    }]);
    this.step.set(this._message ? 'priority' : 'greeting');
    this._scrollBottom();
  }

  private _startInactivityTimer(): void {
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    this._inactivityTimer = setTimeout(() => this._onInactivityTimeout(), INACTIVITY_TIMEOUT_MS);
  }

  private _resetInactivityTimer(): void {
    if (this.step() === 'live_chat') this._startInactivityTimer();
  }

  private _onInactivityTimeout(): void {
    this._inactivityTimer = null;
    if (this.step() !== 'live_chat') return;
    const session = this.liveSession();
    if (!session) return;
    // Inject a system message then close
    this.liveMessages.update(list => [...list, {
      id:         'sys-inactivity-' + Date.now(),
      sessionId:  session.id,
      senderType: 'system' as const,
      senderId:   'system',
      senderName: 'System',
      text:       'This session was automatically closed after 15 minutes of inactivity.',
      sentAt:     new Date().toISOString(),
    }]);
    this._scrollLiveBottom();
    this.endLiveChat();
  }

  private _clearLiveTimers(): void {
    if (this._pendingTimer)    { clearTimeout(this._pendingTimer);    this._pendingTimer    = null; }
    if (this._inactivityTimer) { clearTimeout(this._inactivityTimer); this._inactivityTimer = null; }
    if (this._typingTimer)     { clearTimeout(this._typingTimer);     this._typingTimer     = null; }
  }
}
