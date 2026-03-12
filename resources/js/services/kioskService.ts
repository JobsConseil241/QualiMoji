import api from '@/lib/api';

export interface KioskQuestion {
    sentiment: string;
    emoji: string;
    label: string;
    question: string;
    options: { id: string; label: string; order: number }[];
    allowFreeText: boolean;
    isActive: boolean;
}

export async function fetchKioskConfig(branchId: string) {
    const { data } = await api.get(`/kiosk/config/${branchId}`);

    const raw = data.kiosk_config;
    const org = data.organization ?? {};
    const branch = data.branch ?? {};
    const questionConfigs = data.question_configs ?? [];

    // Transform question_configs to KioskQuestion[]
    const questions: KioskQuestion[] = questionConfigs
        .filter((q: any) => q.is_active !== false)
        .map((q: any) => ({
            sentiment: q.sentiment,
            emoji: q.emoji ?? ({ very_happy: '😊', happy: '🙂', unhappy: '😕', very_unhappy: '😞' }[q.sentiment] || '🙂'),
            label: q.label ?? q.sentiment,
            question: q.question ?? '',
            options: Array.isArray(q.options)
                ? q.options.map((o: any, i: number) => ({
                    id: o.id ?? String(i),
                    label: o.label ?? '',
                    order: o.order ?? i,
                }))
                : [],
            allowFreeText: q.allow_free_text ?? true,
            isActive: q.is_active ?? true,
        }));

    // Build unified config object expected by Kiosk component
    const config = {
        welcomeMessage: raw?.welcome_message ?? 'Comment évaluez-vous votre expérience ?',
        startButtonText: raw?.start_button_text ?? 'Donner mon avis',
        inactivityTimeout: raw?.inactivity_timeout ?? 30,
        screensaverDelay: raw?.screensaver_delay ?? 60,
        autoResetDelay: raw?.auto_reset_delay ?? 10,
        screensaverEnabled: raw?.screensaver_enabled ?? true,
        soundsEnabled: raw?.sounds_enabled ?? false,
        hapticEnabled: raw?.haptic_enabled ?? true,
        offlineModeEnabled: raw?.offline_mode_enabled ?? true,
        screensaverSlides: raw?.screensaver_slides ?? [],
        footerText: raw?.footer_text ?? 'Propulsé par QualityHub',
        branchName: branch.name ?? '',
        questions,
        branding: {
            orgName: org.name ?? '',
            logoUrl: org.logo_url ?? null,
            primaryColor: org.primary_color ?? '#3b82f6',
            logoSize: org.kiosk_logo_size ?? 'medium',
            logoPosition: org.kiosk_logo_position ?? 'center',
            showOrgName: org.kiosk_show_org_name ?? true,
            showBranchName: org.kiosk_show_branch_name ?? true,
        },
    };

    return {
        config,
        questionConfigs: questions,
        organization: org,
        branch,
    };
}

export async function submitKioskFeedback(feedback: {
    branchId: string;
    sentiment: string;
    followUpResponses?: any;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    wantsCallback?: boolean;
}) {
    const { data } = await api.post('/kiosk/feedback', {
        branch_id: feedback.branchId,
        sentiment: feedback.sentiment,
        follow_up_responses: feedback.followUpResponses,
        customer_name: feedback.customerName,
        customer_email: feedback.customerEmail,
        customer_phone: feedback.customerPhone,
        wants_callback: feedback.wantsCallback,
    });
    return data.feedback ?? data;
}

export async function syncOfflineFeedbacks(feedbacks: any[]) {
    const { data } = await api.post('/kiosk/sync', { feedbacks });
    return data;
}
