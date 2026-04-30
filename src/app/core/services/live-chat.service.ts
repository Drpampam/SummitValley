import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';
import { LiveChatSession, LiveChatMessage, LiveChatStatus } from '../models/live-chat.model';

@Injectable({ providedIn: 'root' })
export class LiveChatService {
  private sb      = inject(SupabaseService);
  private storage = inject(StorageService);

  private _sessions: WritableSignal<LiveChatSession[]>;
  private _messages: WritableSignal<LiveChatMessage[]>;
  private _channels = new Map<string, RealtimeChannel>();

  readonly onlineAgentCount = signal(0);

  constructor() {
    this._sessions = signal(this.storage.get<LiveChatSession[]>('live_chat_sessions') ?? []);
    this._messages = signal(this.storage.get<LiveChatMessage[]>('live_chat_messages') ?? []);
    effect(() => { this.storage.set('live_chat_sessions', this._sessions()); });
    effect(() => { this.storage.set('live_chat_messages', this._messages()); });
  }

  readonly pendingSessions = computed<LiveChatSession[]>(() =>
    [...this._sessions().filter(s => s.status === 'pending')]
      .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
  );

  readonly activeSessions = computed<LiveChatSession[]>(() =>
    this._sessions().filter(s => s.status === 'active')
  );

  readonly allOpenSessions = computed<LiveChatSession[]>(() =>
    [...this._sessions().filter(s => s.status === 'pending' || s.status === 'active')]
      .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
  );

  readonly pendingCount = computed(() => this._sessions().filter(s => s.status === 'pending').length);

  getSession(id: string): LiveChatSession | undefined {
    return this._sessions().find(s => s.id === id);
  }

  getMessages(sessionId: string): LiveChatMessage[] {
    return [...this._messages().filter(m => m.sessionId === sessionId)]
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  createSession(data: {
    customerId?:  string;
    guestName?:   string;
    guestEmail?:  string;
    topic:        string;
    priorContext: string;
  }): LiveChatSession {
    const session: LiveChatSession = {
      id:           'lcs-' + Date.now(),
      customerId:   data.customerId,
      guestName:    data.guestName,
      guestEmail:   data.guestEmail,
      topic:        data.topic,
      priorContext: data.priorContext,
      status:       'pending',
      openedAt:     new Date().toISOString(),
    };
    this._sessions.update(list => [session, ...list]);
    this._broadcastToQueue('new_session', session);
    return session;
  }

  acceptSession(sessionId: string, agentId: string, agentName: string): LiveChatSession | undefined {
    let accepted: LiveChatSession | undefined;
    this._sessions.update(list =>
      list.map(s => {
        if (s.id === sessionId && s.status === 'pending') {
          accepted = { ...s, status: 'active' as LiveChatStatus, agentId, agentName, acceptedAt: new Date().toISOString() };
          return accepted;
        }
        return s;
      })
    );
    if (accepted) {
      this._broadcastToQueue('session_update', accepted);
      this._broadcastOnSession(accepted.id, 'session_update', accepted);
    }
    return accepted;
  }

  closeSession(sessionId: string): void {
    let closed: LiveChatSession | undefined;
    this._sessions.update(list =>
      list.map(s => {
        if (s.id === sessionId) {
          closed = { ...s, status: 'closed' as LiveChatStatus, closedAt: new Date().toISOString() };
          return closed;
        }
        return s;
      })
    );
    if (closed) {
      this._broadcastToQueue('session_update', closed);
      this._broadcastOnSession(closed.id, 'session_update', closed);
    }
  }

  addMessage(msg: Omit<LiveChatMessage, 'id' | 'sentAt'>): LiveChatMessage {
    const message: LiveChatMessage = {
      id:     'lcm-' + Date.now() + Math.random().toString(36).slice(2, 5),
      sentAt: new Date().toISOString(),
      ...msg,
    };
    this._messages.update(list => [...list, message]);
    this._broadcastOnSession(message.sessionId, 'message', message);
    return message;
  }

  // ── Supabase Queue ────────────────────────────────────────────────────────

  subscribeToQueue(
    onNewSession:    (s: LiveChatSession) => void,
    onSessionUpdate: (s: LiveChatSession) => void,
  ): () => void {
    if (!this.sb.isConfigured) return () => {};
    const existing = this._channels.get('queue');
    if (existing) return () => { existing.unsubscribe(); };

    const channel = this.sb.client.channel('live-chat-queue');
    channel
      .on('broadcast', { event: 'new_session' },    ({ payload }) => onNewSession(payload as LiveChatSession))
      .on('broadcast', { event: 'session_update' }, ({ payload }) => {
        const s = payload as LiveChatSession;
        this._sessions.update(list => list.map(x => x.id === s.id ? s : x));
        onSessionUpdate(s);
      })
      .subscribe();
    this._channels.set('queue', channel);
    return () => { channel.unsubscribe(); this._channels.delete('queue'); };
  }

  // ── Supabase Session Channel ──────────────────────────────────────────────

  subscribeToSession(
    sessionId:       string,
    onMessage:       (m: LiveChatMessage)  => void,
    onSessionUpdate: (s: LiveChatSession)  => void,
    onTyping:        (id: string, t: boolean) => void,
  ): () => void {
    if (!this.sb.isConfigured) return () => {};
    if (this._channels.has(`session-${sessionId}`)) return () => {};

    const channel = this.sb.client.channel(`live-chat-${sessionId}`);
    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as LiveChatMessage;
        this._messages.update(list =>
          list.some(m => m.id === msg.id) ? list : [...list, msg]
        );
        onMessage(msg);
      })
      .on('broadcast', { event: 'session_update' }, ({ payload }) => {
        const s = payload as LiveChatSession;
        this._sessions.update(list => list.map(x => x.id === s.id ? s : x));
        onSessionUpdate(s);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        onTyping(payload.userId as string, payload.typing as boolean);
      })
      .subscribe();
    this._channels.set(`session-${sessionId}`, channel);
    return () => {
      channel.unsubscribe();
      this._channels.delete(`session-${sessionId}`);
    };
  }

  broadcastTyping(sessionId: string, userId: string, typing: boolean): void {
    const channel = this._channels.get(`session-${sessionId}`);
    channel?.send({ type: 'broadcast', event: 'typing', payload: { userId, typing } });
  }

  // ── Agent Presence ────────────────────────────────────────────────────────

  subscribeToAgentPresence(agentId: string, agentName: string): () => void {
    if (!this.sb.isConfigured) return () => {};
    const channel = this.sb.client.channel('live-chat-agents', {
      config: { presence: { key: agentId } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        this.onlineAgentCount.set(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ agentId, agentName, status: 'online' });
        }
      });
    this._channels.set('agent-presence', channel);
    return () => { channel.unsubscribe(); this._channels.delete('agent-presence'); };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private _broadcastToQueue(event: string, payload: unknown): void {
    if (!this.sb.isConfigured) return;
    const ch = this._channels.get('queue');
    ch?.send({ type: 'broadcast', event, payload });
  }

  private _broadcastOnSession(sessionId: string, event: string, payload: unknown): void {
    if (!this.sb.isConfigured) return;
    const ch = this._channels.get(`session-${sessionId}`);
    ch?.send({ type: 'broadcast', event, payload });
  }

  unsubscribeAll(): void {
    this._channels.forEach(ch => ch.unsubscribe());
    this._channels.clear();
  }
}
