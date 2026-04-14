export interface Statement {
  id: string;
  accountId: string;
  month: number;
  year: number;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
  generatedAt: string;
  pdfSize: string;
}
