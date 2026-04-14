import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GoalService } from '../../core/services/goal.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../core/services/toast.service';
import { LocaleService } from '../../core/services/locale.service';
import { SavingsGoal } from '../../core/models/goal.model';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './goals.html',
  styleUrl: './goals.scss',
})
export class GoalsComponent implements OnInit {
  private goalSvc = inject(GoalService);
  private accSvc  = inject(AccountService);
  private toast   = inject(ToastService);
  private locale  = inject(LocaleService);
  private fb      = inject(FormBuilder);

  activeGoals    = this.goalSvc.active;
  completedGoals = this.goalSvc.completed;
  totalSaved     = this.goalSvc.totalSaved;
  accounts       = this.accSvc.accounts;
  currency       = this.locale.currencySymbol;

  showForm    = signal(false);
  editingGoal = signal<SavingsGoal | null>(null);
  addFundsFor = signal<string | null>(null);
  fundsAmount = signal(0);

  readonly goalIcons = ['savings', 'flight_takeoff', 'home', 'directions_car', 'school', 'laptop', 'celebration', 'shield', 'favorite', 'beach_access'];
  readonly goalColors = ['#CC0000','#0891b2','#15803d','#8b5cf6','#ec4899','#FFCD41','#f97316','#6b7280'];

  form = this.fb.group({
    name:                ['', [Validators.required, Validators.maxLength(40)]],
    targetAmount:        [null as number | null, [Validators.required, Validators.min(1)]],
    linkedAccountId:     ['', Validators.required],
    targetDate:          ['', Validators.required],
    icon:                ['savings'],
    color:               ['#CC0000'],
    autoContribute:      [false],
    monthlyContribution: [null as number | null],
  });

  ngOnInit(): void {
    const accs = this.accounts();
    if (accs.length) this.form.patchValue({ linkedAccountId: accs[0].id });
  }

  openForm(goal?: SavingsGoal): void {
    this.editingGoal.set(goal ?? null);
    if (goal) {
      this.form.patchValue({
        name: goal.name, targetAmount: goal.targetAmount,
        linkedAccountId: goal.linkedAccountId, targetDate: goal.targetDate.split('T')[0],
        icon: goal.icon, color: goal.color,
        autoContribute: goal.autoContribute, monthlyContribution: goal.monthlyContribution ?? null,
      });
    } else {
      this.form.reset({ linkedAccountId: this.accounts()[0]?.id, icon: 'savings', color: '#CC0000' });
    }
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); this.editingGoal.set(null); }

  saveGoal(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const editing = this.editingGoal();
    if (editing) {
      this.goalSvc.updateGoal(editing.id, {
        name: v.name!, targetAmount: v.targetAmount!, linkedAccountId: v.linkedAccountId!,
        targetDate: new Date(v.targetDate!).toISOString(), icon: v.icon!, color: v.color!,
        autoContribute: v.autoContribute!, monthlyContribution: v.monthlyContribution ?? undefined,
      });
      this.toast.success('Goal updated.');
    } else {
      this.goalSvc.createGoal({
        name: v.name!, targetAmount: v.targetAmount!, currentAmount: 0,
        linkedAccountId: v.linkedAccountId!, targetDate: new Date(v.targetDate!).toISOString(),
        icon: v.icon!, color: v.color!,
        autoContribute: v.autoContribute!, monthlyContribution: v.monthlyContribution ?? undefined,
      });
      this.toast.success('Goal created!');
    }
    this.closeForm();
  }

  deleteGoal(id: string): void {
    this.goalSvc.deleteGoal(id);
    this.toast.info('Goal deleted.');
  }

  togglePause(goal: SavingsGoal): void {
    this.goalSvc.updateGoal(goal.id, { status: goal.status === 'paused' ? 'active' : 'paused' });
  }

  openAddFunds(goalId: string): void { this.addFundsFor.set(goalId); this.fundsAmount.set(0); }
  closeAddFunds(): void { this.addFundsFor.set(null); }

  confirmAddFunds(goalId: string): void {
    const amt = this.fundsAmount();
    if (amt <= 0) return;
    this.goalSvc.addFunds(goalId, amt);
    this.toast.success(`${this.currency()}${amt.toFixed(2)} added to your goal!`);
    this.closeAddFunds();
  }

  progress(goal: SavingsGoal): number { return this.goalSvc.progress(goal); }
  daysLeft(date: string): number { return this.goalSvc.daysRemaining(date); }

  accountLabel(id: string): string {
    const a = this.accounts().find(a => a.id === id);
    return a ? `${a.type === 'checking' ? 'Checking' : 'Savings'} ${a.accountNumber}` : '';
  }
}
