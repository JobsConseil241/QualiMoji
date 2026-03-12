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

export async function saveGlobalKioskConfig(config: any) {
    const { data } = await api.post('/settings/kiosk', config);
    return data;
}

export async function saveBranchKioskConfig(branchId: string, config: any) {
    const { data } = await api.post('/settings/kiosk', { ...config, branch_id: branchId });
    return data;
}

export async function getAllBranchConfigs() {
    const { data } = await api.get('/settings/kiosk');
    return data;
}
