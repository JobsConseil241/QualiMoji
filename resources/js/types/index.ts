export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'quality_director' | 'branch_manager' | 'it_admin';
  avatar?: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address?: string;
  region: string;
  satisfactionScore: number;
  totalFeedbacks: number;
  activeAlerts: number;
  trend: 'up' | 'down' | 'stable';
  trendValue?: number;
  responseRate?: number;
}

export interface Feedback {
  id: string;
  branchId: string;
  branchName: string;
  score: number;
  comment: string;
  category: string;
  sentiment: 'positive' | 'negative';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  isProcessed?: boolean;
  createdAt: string;
}

export interface CommonIssue {
  label: string;
  percentage: number;
  count: number;
}

export interface Alert {
  id: string;
  branchId: string;
  branchName: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface KPIConfig {
  id: string;
  name: string;
  threshold: number;
  unit: string;
  isActive: boolean;
}

export interface DashboardStats {
  totalBranches: number;
  averageSatisfaction: number;
  totalFeedbacks: number;
  activeAlerts: number;
  satisfactionTrend: number;
}
