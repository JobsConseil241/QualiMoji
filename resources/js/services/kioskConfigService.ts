import api from '@/lib/api';

export async function getKioskConfig(branchId?: string) {
    if (branchId) {
        const { data } = await api.get(`/kiosk/config/${branchId}`);
        return data;
    }
    const { data } = await api.get('/settings/kiosk');
    return data;
}

export async function getGlobalKioskConfig() {
    const { data } = await api.get('/settings/kiosk');
    return data.kiosk_config ?? data.data ?? null;
}

export async function getBranchKioskConfig(branchId: string) {
    const { data } = await api.get(`/kiosk/config/${branchId}`);
    return data.kiosk_config ?? data.data ?? null;
}

function toSnakeCase(config: any) {
    return {
        welcome_message: config.welcomeMessage,
        start_button_text: config.startButtonText,
        inactivity_timeout: config.inactivityTimeout,
        screensaver_delay: config.screensaverDelay,
        auto_reset_delay: config.autoResetDelay,
        screensaver_enabled: config.screensaverEnabled,
        sounds_enabled: config.soundsEnabled,
        haptic_enabled: config.hapticEnabled,
        offline_mode_enabled: config.offlineModeEnabled,
        screensaver_slides: (config.screensaverSlides ?? []).map((s: any) => ({
            id: s.id,
            image_url: s.imageUrl,
            title: s.title,
            subtitle: s.subtitle,
            order: s.order,
        })),
        footer_text: config.footerText,
    };
}

export async function saveGlobalKioskConfig(config: any) {
    const { data } = await api.post('/settings/kiosk', toSnakeCase(config));
    return data;
}

export async function saveBranchKioskConfig(branchId: string, config: any) {
    const { data } = await api.post('/settings/kiosk', { ...toSnakeCase(config), branch_id: branchId });
    return data;
}

export async function getAllBranchConfigs() {
    const { data } = await api.get('/settings/kiosk');
    return data;
}
