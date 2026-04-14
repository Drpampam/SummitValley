import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { SavingsGoal } from '../models/goal.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_GOALS } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _all: WritableSignal<SavingsGoal[]>;

  constructor() {
    this._all = signal(this.storage.get<SavingsGoal[]>('goals') ?? MOCK_GOALS);
    effect(() => { this.storage.set('goals', this._all()); });
  }

  readonly myGoals = computed<SavingsGoal[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._all().filter(g => g.userId === user.id);
  });

  readonly active    = computed(() => this.myGoals().filter(g => g.status === 'active'));
  readonly completed = computed(() => this.myGoals().filter(g => g.status === 'completed'));
  readonly totalSaved = computed(() => this.myGoals().reduce((s, g) => s + g.currentAmount, 0));

  getGoals(): Observable<SavingsGoal[]> { return of(this.myGoals()).pipe(delay(300)); }

  createGoal(data: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'status'>): void {
    const user = this.auth.user();
    if (!user) return;
    const goal: SavingsGoal = {
      ...data,
      id: 'goal-' + Date.now(),
      userId: user.id,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this._all.update(list => [goal, ...list]);
  }

  updateGoal(id: string, partial: Partial<SavingsGoal>): void {
    this._all.update(list => list.map(g => g.id === id ? { ...g, ...partial } : g));
  }

  deleteGoal(id: string): void {
    this._all.update(list => list.filter(g => g.id !== id));
  }

  addFunds(goalId: string, amount: number): void {
    this._all.update(list => list.map(g => {
      if (g.id !== goalId) return g;
      const newAmount = Math.min(g.currentAmount + amount, g.targetAmount);
      return { ...g, currentAmount: newAmount, status: newAmount >= g.targetAmount ? 'completed' : g.status };
    }));
  }

  daysRemaining(targetDate: string): number {
    const diff = new Date(targetDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  progress(goal: SavingsGoal): number {
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  }
}
