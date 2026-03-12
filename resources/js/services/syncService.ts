import { syncOfflineFeedbacks } from './kioskService';
import {
    getPendingFeedbacks,
    removePendingFeedback,
    incrementRetry,
} from '@/services/offlineStore';

const MAX_RETRIES = 5;

export async function syncPendingFeedbacks(): Promise<{
    synced: number;
    failed: number;
    remaining: number;
}> {
    const pending = await getPendingFeedbacks();
    let synced = 0;
    let failed = 0;

    const feedbacksToSync = pending.filter(f => f.retryCount < MAX_RETRIES);
    const stale = pending.filter(f => f.retryCount >= MAX_RETRIES);

    // Remove stale entries
    for (const entry of stale) {
        await removePendingFeedback(entry.id);
        failed++;
    }

    if (feedbacksToSync.length > 0) {
        try {
            await syncOfflineFeedbacks(feedbacksToSync.map(f => ({
                branch_id: f.payload.branchId,
                sentiment: f.payload.sentiment,
                follow_up_responses: f.payload.followUpResponses || {},
                customer_name: f.payload.customerName || null,
                customer_email: f.payload.customerEmail || null,
                customer_phone: f.payload.customerPhone || null,
                wants_callback: f.payload.wantsCallback ?? false,
            })));

            for (const f of feedbacksToSync) {
                await removePendingFeedback(f.id);
                synced++;
            }
        } catch {
            // Increment retry count for each failed entry
            for (const f of feedbacksToSync) {
                await incrementRetry(f.id);
            }
            failed += feedbacksToSync.length;
        }
    }

    const remaining = await getPendingFeedbacks().then(p => p.length);
    return { synced, failed, remaining };
}
