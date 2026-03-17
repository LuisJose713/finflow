// ─── User ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// ─── Transaction ───────────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  description?: string;
}

export interface CreateTransactionRequest {
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  description?: string;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

// ─── Goal ──────────────────────────────────────────────────────────────────
export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status: GoalStatus;
  description?: string;
}

export interface CreateGoalRequest {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  deadline: string;
  description?: string;
}

// ─── Advisor ───────────────────────────────────────────────────────────────
export interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AdvisorCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
