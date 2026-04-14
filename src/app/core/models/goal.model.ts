export type GoalStatus = 'active' | 'completed' | 'paused';

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  linkedAccountId: string;
  targetDate: string;
  status: GoalStatus;
  icon: string;
  color: string;
  createdAt: string;
  autoContribute: boolean;
  monthlyContribution?: number;
}
