import { useState, useEffect, useCallback } from 'react';
import { fetchKioskConfig } from '@/services/kioskService';

export function useKioskConfig(branchId: string | undefined) {
    const [config, setConfig] = useState<any>(null);
    const [questionConfigs, setQuestionConfigs] = useState<any[]>([]);
    const [organization, setOrganization] = useState<any>(null);
    const [branch, setBranch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadConfig = useCallback(async () => {
        if (!branchId) return;
        try {
            setLoading(true);
            const data = await fetchKioskConfig(branchId);
            setConfig(data.config);
            setQuestionConfigs(data.questionConfigs || []);
            setOrganization(data.organization);
            setBranch(data.branch);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        loadConfig();
        const interval = setInterval(loadConfig, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [loadConfig]);

    return { config, questionConfigs, organization, branch, loading, error, refetch: loadConfig };
}
