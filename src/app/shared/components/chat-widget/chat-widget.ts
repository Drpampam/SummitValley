import { Component, inject, signal, ViewChild, ElementRef, afterNextRender } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { EmailService } from '../../../core/services/email.service';

type ChatStep = 'greeting' | 'message' | 'contact_info' | 'priority' | 'submitting' | 'done';

interface Msg { from: 'bot' | 'user'; text: string; }

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './chat-widget.html',
  styleUrl:    './chat-widget.scss',
})
export class ChatWidgetComponent {
  private auth     = inject(AuthService);
  private emailSvc = inject(EmailService);

  @ViewChild('msgList') private msgList!: ElementRef<HTMLElement>;

  isOpen     = signal(false);
  step       = signal<ChatStep>('greeting');
  messages   = signal<Msg[]>([]);
  isTyping   = signal(false);
  inputText  = signal('');
  caseRef    = signal('');
  guestName  = signal('');
  guestEmail = signal('');

  private _topic    = '';
  private _message  = '';

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
      ? `👋 Hi there! I'm SVB Assistant — I'm here to help before you even log in.`
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
      if (this.msgList?.nativeElement) {
        this.msgList.nativeElement.scrollTop = this.msgList.nativeElement.scrollHeight;
      }
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
      this._botReply(`Thanks for the details! So I can follow up with you, could you share your name and email?`);
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

  startOver(): void {
    this.messages.set([]);
    this.step.set('greeting');
    this.inputText.set('');
    this._topic      = '';
    this._message    = '';
    this.caseRef.set('');
    this.guestName.set('');
    this.guestEmail.set('');
    this._start();
  }
}
