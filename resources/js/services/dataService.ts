import api from '@/lib/api';

/* ---------- Types used by Dashboard & other pages ---------- */
export interface DbBranch {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    region: string | null;
    is_active: boolean;
    organization_id?: string;
}

export interface DbFeedback {
    id: string;
    branch_id: string;
    sentiment: string;
    comment: string | null;
    contact_phone: string | null;
    created_at: string;
}

export interface DbAlert {
    id: string;
    branch_id: string;
    branch_name: string;
    type: string;
    message: string;
    status: string;
    is_read: boolean;
    created_at: string;
}

export function computeBranchStats(branch: DbBranch, feedbacks: DbFeedback[]) {
    const branchFeedbacks = feedbacks.filter(f => f.branch_id === branch.id);
    const sentimentScores: Record<string, number> = { very_happy: 5, happy: 4, neutral: 3, unhappy: 1 };
    const totalFeedbacks = branchFeedbacks.length;
    const avgScore = totalFeedbacks > 0
        ? branchFeedbacks.reduce((s, f) => s + (sentimentScores[f.sentiment] || 3), 0) / totalFeedbacks
        : 0;
    return {
        totalFeedbacks,
        satisfactionScore: Math.round((avgScore / 5) * 100),
    };
}

export async function fetchDashboardStats(period: string = '30d') {
    const { data } = await api.get('/dashboard', { params: { period } });
    return data;
}

export async function fetchSatisfactionChart(period: string = '30d', branchId?: string) {
    // Satisfaction chart data is included in the dashboard response (daily_stats)
    const { data } = await api.get('/dashboard', {
        params: { period, branch_id: branchId },
    });
    return data.daily_stats;
}

export async function fetchSentimentChart(period: string = '30d') {
    // Sentiment data is included in the dashboard response (sentiment_counts)
    const { data } = await api.get('/dashboard', { params: { period } });
    return data.sentiment_counts;
}

export async function fetchBranches(period: string = '30d', search?: string) {
    const { data } = await api.get('/branches', { params: { period, search } });
    return data.branches ?? data.data ?? data;
}

export async function fetchBranchDetail(id: string, period: string = '30d') {
    const { data } = await api.get(`/branches/${id}`, { params: { period } });
    return data;
}

export async function createBranch(branch: any) {
    const { data } = await api.post('/branches', branch);
    return data;
}

export async function updateBranch(id: string, branch: any) {
    const { data } = await api.put(`/branches/${id}`, branch);
    return data;
}

export async function deleteBranch(id: string) {
    const { data } = await api.delete(`/branches/${id}`);
    return data;
}

export async function importBranches(branches: any[]) {
    const { data } = await api.post('/branches/import', { branches });
    return data;
}

export async function fetchFeedbacks(params?: any) {
    const { data } = await api.get('/feedbacks', { params });
    return data.data ?? data;
}

export async function insertFeedback(feedback: any) {
    const { data } = await api.post('/feedbacks', feedback);
    return data;
}

export async function fetchAlerts(params?: any) {
    const { data } = await api.get('/alerts', { params });
    return data.data ?? data;
}

export async function fetchUnreadAlertCount() {
    const { data } = await api.get('/alerts/stats');
    return data.unread;
}

export async function markAlertAsRead(id: string) {
    const { data } = await api.post(`/alerts/${id}/read`);
    return data;
}

export async function markAllAlertsAsRead() {
    const { data } = await api.post('/alerts/mark-all-read');
    return data;
}

export async function resolveAlert(id: string, resolutionNote?: string) {
    const { data } = await api.post(`/alerts/${id}/resolve`, { resolution_note: resolutionNote });
    return data;
}

export async function dismissAlert(id: string) {
    const { data } = await api.post(`/alerts/${id}/resolve`, { resolution_note: 'Dismissed' });
    return data;
}

// Polling replacement for realtime subscriptions
export function subscribeFeedbacks(callback: (payload: any) => void) {
    const interval = setInterval(async () => {
        try {
            const data = await fetchFeedbacks({ per_page: 1 });
            callback(data);
        } catch (e) {}
    }, 30000);
    return { unsubscribe: () => clearInterval(interval) };
}

export function subscribeAlerts(callback: (payload: any) => void) {
    const interval = setInterval(async () => {
        try {
            const count = await fetchUnreadAlertCount();
            callback({ count });
        } catch (e) {}
    }, 30000);
    return { unsubscribe: () => clearInterval(interval) };
}
