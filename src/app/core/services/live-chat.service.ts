import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';
import { LiveChatSession, LiveChatMessage, LiveChatStatus } from '../models/live-chat.model';

interface QueueEntry {
  onNewSession:    (s: LiveChatSession) => void;
  onSessionUpdate: (s: LiveChatSession) => void;
}

interface SessionEntry {
  onMessage:       (m: LiveChatMessage) => void;
  onSessionUpdate: (s: LiveChatSession) => void;
}

@Injectable({ providedIn: 'root' })
export class LiveChatService {
  private sb      = inject(SupabaseService);
  private storage = inject(StorageService);

  private _sessions: WritableSignal<LiveChatSession[]>;
  private _messages: WritableSignal<LiveChatMessage[]>;
  private _channels = new Map<string, RealtimeChannel>();

  /**
   * Cross-tab (same browser) callback registries.
   * Supabase handles cross-device; storage events handle cross-tab.
   * Guards in _listenCrossTab prevent double-delivery when both paths are active.
   */
  private _queueCbs:  QueueEntry[] = [];
  private _sessionCbs = new Map<string, SessionEntry>();

  readonly onlineAgentCount = signal(0);

  static readonly STALE_PENDING_MS = 2 * 60 * 60 * 1000; // 2 h

  constructor() {
    this._sessions = signal(this.storage.get<LiveChatSession[]>('live_chat_sessions') ?? []);
    this._messages = signal(this.storage.get<LiveChatMessage[]>('live_chat_messages') ?? []);
    effect(() => { this.storage.set('live_chat_sessions', this._sessions()); });
    effect(() => { this.storage.set('live_chat_messages', this._messages()); });
    this._pruneStale();
    this._listenCrossTab();
  }

  // ── Cross-tab sync (same browser, different tabs) ─────────────────────────

  private _listenCrossTab(): void {
    window.addEventListener('storage', (e: StorageEvent) => {

      if (e.key === 'svb_live_chat_sessions' && e.newValue !== null) {
        try {
          const incoming = JSON.parse(e.newValue) as LiveChatSession[];
          const prevMap  = new Map(this._sessions().map(s => [s.id, s]));
          this._sessions.set(incoming);

          incoming.forEach(s => {
            const prev = prevMap.get(s.id);

            if (!prev && s.status === 'pending') {
              // New session — skip if Supabase queue is live (Supabase delivers it)
              if (!this._channels.has('queue')) {
                this._queueCbs.forEach(cb => cb.onNewSession(s));
              }
            } else if (prev && prev.status !== s.status) {
              // Status change
              if (!this._channels.has('queue')) {
                this._queueCbs.forEach(cb => cb.onSessionUpdate(s));
              }
              if (!this._channels.has(`session-${s.id}`)) {
                this._sessionCbs.get(s.id)?.onSessionUpdate(s);
              }
              // Customer queue subscription (subscribeCustomerToQueue path)
              if (!this._channels.has(`session-${s.id}`)) {
                this._customerQueueCbs.get(s.id)?.(s);
              }
            }
          });
        } catch { /* ignore parse errors */ }
      }

      if (e.key === 'svb_live_chat_messages' && e.newValue !== null) {
        try {
          const incoming = JSON.parse(e.newValue) as LiveChatMessage[];
          const oldIds   = new Set(this._messages().map(m => m.id));
          this._messages.set(incoming);
          incoming
            .filter(m => !oldIds.has(m.id))
            .forEach(m => {
              // Skip cross-tab delivery if Supabase session channel is live
              if (!this._channels.has(`session-${m.sessionId}`)) {
                this._sessionCbs.get(m.sessionId)?.onMessage(m);
              }
            });
        } catch { /* ignore parse errors */ }
      }
    });
  }

  // ── Stale session pruning ─────────────────────────────────────────────────

  private _pruneStale(): void {
    const cutoff = Date.now() - LiveChatService.STALE_PENDING_MS;
    this._sessions.update(list =>
      list.map(s =>
        s.status === 'pending' && new Date(s.openedAt).getTime() < cutoff
          ? { ...s, status: 'abandoned' as LiveChatStatus, closedAt: new Date().toISOString() }
          : s
      )
    );
  }

  // ── Computed views ────────────────────────────────────────────────────────

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

  readonly pendingCount = computed(() =>
    this._sessions().filter(s => s.status === 'pending').length
  );

  getSession(id: string): LiveChatSession | undefined {
    return this._sessions().find(s => s.id === id);
  }

  getMessages(sessionId: string): LiveChatMessage[] {
    return [...this._messages().filter(m => m.sessionId === sessionId)]
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────

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
    // Cross-tab handled by storage event; Supabase handled in subscribeCustomerToQueue
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
      // Queue broadcast: reaches customer who is subscribed to queue via subscribeCustomerToQueue
      this._broadcastToQueue('session_update', accepted);
      // Session channel broadcast: reaches customer if already subscribed (message channel)
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

  abandonSession(sessionId: string): void {
    let abandoned: LiveChatSession | undefined;
    this._sessions.update(list =>
      list.map(s => {
        if (s.id === sessionId && (s.status === 'pending' || s.status === 'active')) {
          abandoned = { ...s, status: 'abandoned' as LiveChatStatus, closedAt: new Date().toISOString() };
          return abandoned;
        }
        return s;
      })
    );
    if (abandoned) {
      this._broadcastToQueue('session_update', abandoned);
      this._broadcastOnSession(abandoned.id, 'session_update', abandoned);
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

  // ── Customer queue subscription ───────────────────────────────────────────
  // Used by the chat widget so the customer can:
  //   a) broadcast new_session to agents on other devices (Supabase)
  //   b) receive session_update (accept/close) from agents via queue channel

  private _customerQueueCbs = new Map<string, (s: LiveChatSession) => void>();

  subscribeCustomerToQueue(
    sessionId: string,
    onSessionUpdate: (s: LiveChatSession) => void,
  ): () => void {
    // Always register for cross-tab delivery
    this._customerQueueCbs.set(sessionId, onSessionUpdate);
    const removeLocal = () => this._customerQueueCbs.delete(sessionId);

    if (!this.sb.isConfigured) return removeLocal;

    // If agent queue channel already exists in this instance, piggyback on it
    const existing = this._channels.get('queue');
    if (existing) {
      // The agent's queue channel will already deliver session_update events
      // via _queueCbs → but _queueCbs contains agent callbacks, not customer ones.
      // We need to listen ourselves — but we can't add a new handler to an existing
      // subscribed channel. Instead, the cross-tab path covers same-device; for
      // cross-device this code path only runs on the customer's own instance
      // (no agent on the same device), so `existing` won't be present.
      return removeLocal;
    }

    // Subscribe customer to queue channel so they can send new_session broadcasts
    // and receive session_update (agent accept) events
    const channel = this.sb.client.channel('live-chat-queue');
    channel
      .on('broadcast', { event: 'session_update' }, ({ payload }) => {
        const s = payload as LiveChatSession;
        if (s.id === sessionId) {
          this._sessions.update(list => list.map(x => x.id === s.id ? s : x));
          onSessionUpdate(s);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Now that we're subscribed, send the new_session broadcast
          // (the session was created before subscribing, so we re-broadcast now)
          const session = this._sessions().find(s => s.id === sessionId);
          if (session && session.status === 'pending') {
            channel.send({ type: 'broadcast', event: 'new_session', payload: session });
          }
        }
      });
    this._channels.set('queue', channel);
    return () => {
      channel.unsubscribe();
      this._channels.delete('queue');
      removeLocal();
    };
  }

  // ── Agent queue subscription ──────────────────────────────────────────────

  subscribeToQueue(
    onNewSession:    (s: LiveChatSession) => void,
    onSessionUpdate: (s: LiveChatSession) => void,
  ): () => void {
    const entry: QueueEntry = { onNewSession, onSessionUpdate };
    this._queueCbs.push(entry);
    const removeLocal = () => {
      this._queueCbs = this._queueCbs.filter(x => x !== entry);
    };

    if (!this.sb.isConfigured) return removeLocal;

    const existing = this._channels.get('queue');
    if (existing) {
      // Channel is already subscribed (either shell already registered, or customer queue).
      // Don't unsubscribe the shared channel — just deregister callbacks on cleanup.
      return removeLocal;
    }

    const channel = this.sb.client.channel('live-chat-queue');
    channel
      .on('broadcast', { event: 'new_session' }, ({ payload }) => {
        const s = payload as LiveChatSession;
        // Update local state and fire all agent queue callbacks
        this._sessions.update(list =>
          list.some(x => x.id === s.id) ? list : [s, ...list]
        );
        this._queueCbs.forEach(cb => cb.onNewSession(s));
      })
      .on('broadcast', { event: 'session_update' }, ({ payload }) => {
        const s = payload as LiveChatSession;
        this._sessions.update(list => list.map(x => x.id === s.id ? s : x));
        this._queueCbs.forEach(cb => cb.onSessionUpdate(s));
      })
      .subscribe();
    this._channels.set('queue', channel);
    // Owned by this subscriber — unsubscribe when this subscriber cleans up
    return () => { channel.unsubscribe(); this._channels.delete('queue'); removeLocal(); };
  }

  // ── Session subscription (messages + typing) ──────────────────────────────

  subscribeToSession(
    sessionId:       string,
    onMessage:       (m: LiveChatMessage)    => void,
    onSessionUpdate: (s: LiveChatSession)    => void,
    onTyping:        (id: string, t: boolean) => void,
  ): () => void {
    // Register cross-tab callbacks (overwrite if called twice — only one subscriber per session per device)
    this._sessionCbs.set(sessionId, { onMessage, onSessionUpdate });
    const removeLocal = () => this._sessionCbs.delete(sessionId);

    if (!this.sb.isConfigured) return removeLocal;

    if (this._channels.has(`session-${sessionId}`)) return removeLocal;

    const channel = this.sb.client.channel(`live-chat-${sessionId}`);
    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as LiveChatMessage;
        // Deduplicate (in case cross-tab also fires)
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
      removeLocal();
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
    this._queueCbs = [];
    this._sessionCbs.clear();
    this._customerQueueCbs.clear();
  }
}
