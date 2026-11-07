// ─── User ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  role?: 'ADMIN' | 'USER';
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
  confirmPassword?: string;
  privacyAccepted: boolean;
  privacyVersion: string;
  marketingConsent: boolean;
}

// ─── Transaction ───────────────────────────────────────────────────────────
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: number;
  amount: number;
  type: TransactionType;
  categoryId: number;
  accountId?: number | null;
  description: string;
  date: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface CreateTransactionRequest {
  amount: number;
  type: TransactionType;
  categoryId: number;
  accountId?: number | null;
  description: string;
  date: string;
  currency?: string;
  status?: string;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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
  createdAt?: string;
}
 
/** Crear meta — currentAmount es opcional (default 0 en backend) */
export interface CreateGoalRequest {
  title: string;
  targetAmount: number;
  currentAmount?: number;
  deadline: string;
  description?: string;
}
 
/** Editar meta — todos los campos opcionales excepto title si lo mandas */
export interface UpdateGoalRequest {
  title?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  description?: string;
  status?: GoalStatus;
}
 
/** Abonar a una meta */
export interface AddContributionRequest {
  amount: number;
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

//---- Category -----------------

export interface Category {
  id: number;
  name: string;
  type: string;
  userId?: number | null;
}


// ─── GoalContribution ──────────────────────────────────────────────────────
export interface GoalContribution {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  note?: string;
  createdAt: string;
}
 
// UpdateGoalRequest — todos opcionales
export interface UpdateGoalRequest {
  title?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  description?: string;
  status?: GoalStatus;
}
 
// AddContributionRequest — con note opcional
export interface AddContributionRequest {
  amount: number;
  note?: string;
}
 

// Agregar pre-Tarea

export type PlannedExpenseStatus = 'pending' | 'done' | 'cancelled';

export interface PlannedExpense {
  id: string;
  userId: number;
  title: string;
  amount: number;
  categoryId?: number;
  dueDate?: string;
  notes?: string;
  status: PlannedExpenseStatus;
  executedTransactionId?: string;
  remindAt?: string;
  createdAt: string;
}

export interface CreatePlannedExpenseRequest {
  title: string;
  amount: number;
  categoryId?: number;
  dueDate?: string;
  notes?: string;
  remindAt?: string;
}