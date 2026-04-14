export interface CategorySpend {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
  trend: number;
}

export interface MonthlyBar {
  label: string;
  income: number;
  expenses: number;
  month: number;
  year: number;
}

export interface TopMerchant {
  name: string;
  category: string;
  totalSpent: number;
  visitCount: number;
  icon: string;
  color: string;
}
