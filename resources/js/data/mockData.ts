import type { Branch, Alert, DashboardStats, Feedback } from '@/types';

export const mockStats: DashboardStats = {
  totalBranches: 24,
  averageSatisfaction: 4.2,
  totalFeedbacks: 3847,
  activeAlerts: 7,
  satisfactionTrend: 3.5,
};

export const mockBranches: Branch[] = [
  { id: '1', name: 'Agence Paris Centre', city: 'Paris', address: '12 Rue de Rivoli, 75001 Paris', region: 'Île-de-France', satisfactionScore: 4.6, totalFeedbacks: 312, activeAlerts: 0, trend: 'up', trendValue: 5.2, responseRate: 82 },
  { id: '2', name: 'Agence Lyon Part-Dieu', city: 'Lyon', address: '45 Boulevard Vivier Merle, 69003 Lyon', region: 'Auvergne-Rhône-Alpes', satisfactionScore: 4.4, totalFeedbacks: 287, activeAlerts: 1, trend: 'up', trendValue: 3.1, responseRate: 78 },
  { id: '3', name: 'Agence Marseille Vieux-Port', city: 'Marseille', address: '8 Quai du Port, 13002 Marseille', region: 'PACA', satisfactionScore: 4.1, totalFeedbacks: 198, activeAlerts: 2, trend: 'stable', trendValue: 0.3, responseRate: 65 },
  { id: '4', name: 'Agence Bordeaux Lac', city: 'Bordeaux', address: '23 Rue Sainte-Catherine, 33000 Bordeaux', region: 'Nouvelle-Aquitaine', satisfactionScore: 3.9, totalFeedbacks: 245, activeAlerts: 1, trend: 'down', trendValue: -4.2, responseRate: 71 },
  { id: '5', name: 'Agence Lille Europe', city: 'Lille', address: '1 Place de la Gare, 59000 Lille', region: 'Hauts-de-France', satisfactionScore: 3.7, totalFeedbacks: 176, activeAlerts: 3, trend: 'down', trendValue: -8.1, responseRate: 58 },
  { id: '6', name: 'Agence Nantes Atlantis', city: 'Nantes', address: '15 Allée des Tanneurs, 44000 Nantes', region: 'Pays de la Loire', satisfactionScore: 4.3, totalFeedbacks: 210, activeAlerts: 0, trend: 'up', trendValue: 2.7, responseRate: 76 },
  { id: '7', name: 'Agence Toulouse Capitole', city: 'Toulouse', address: '5 Place du Capitole, 31000 Toulouse', region: 'Occitanie', satisfactionScore: 4.0, totalFeedbacks: 189, activeAlerts: 0, trend: 'stable', trendValue: 0.1, responseRate: 69 },
  { id: '8', name: 'Agence Strasbourg Gare', city: 'Strasbourg', address: '20 Place de la Gare, 67000 Strasbourg', region: 'Grand Est', satisfactionScore: 3.8, totalFeedbacks: 156, activeAlerts: 1, trend: 'down', trendValue: -2.5, responseRate: 62 },
];

export const mockAlerts: Alert[] = [
  { id: '1', branchId: '5', branchName: 'Agence Lille Europe', type: 'critical', message: 'Score de satisfaction en dessous du seuil critique (3.5)', isRead: false, createdAt: '2026-03-03T09:15:00' },
  { id: '2', branchId: '3', branchName: 'Agence Marseille Vieux-Port', type: 'warning', message: 'Augmentation des retours négatifs sur le temps d\'attente', isRead: false, createdAt: '2026-03-03T08:30:00' },
  { id: '3', branchId: '4', branchName: 'Agence Bordeaux Lac', type: 'warning', message: 'Baisse de 12% du score qualité ce mois', isRead: true, createdAt: '2026-03-02T16:45:00' },
  { id: '4', branchId: '2', branchName: 'Agence Lyon Part-Dieu', type: 'info', message: 'Nouveau record de satisfaction atteint', isRead: true, createdAt: '2026-03-02T14:20:00' },
  { id: '5', branchId: '5', branchName: 'Agence Lille Europe', type: 'critical', message: '3 plaintes non traitées depuis plus de 48h', isRead: false, createdAt: '2026-03-01T11:00:00' },
];

export const mockFeedbacks: Feedback[] = [
  { id: '1', branchId: '1', branchName: 'Agence Paris Centre', score: 5, comment: 'Excellent accueil, très professionnel. Le conseiller a pris le temps de m\'expliquer toutes les options.', category: 'Accueil', sentiment: 'positive', clientName: 'Marie Dupont', clientEmail: 'marie.d@email.com', isProcessed: true, createdAt: '2026-03-03T10:00:00' },
  { id: '2', branchId: '3', branchName: 'Agence Marseille Vieux-Port', score: 2, comment: 'Temps d\'attente beaucoup trop long, plus de 45 minutes avant d\'être reçu.', category: 'Temps d\'attente', sentiment: 'negative', clientName: 'Pierre Martin', clientPhone: '06 12 34 56 78', isProcessed: false, createdAt: '2026-03-03T09:30:00' },
  { id: '3', branchId: '2', branchName: 'Agence Lyon Part-Dieu', score: 4, comment: 'Bon service, personnel aimable et compétent.', category: 'Service', sentiment: 'positive', isProcessed: true, createdAt: '2026-03-02T15:00:00' },
  { id: '4', branchId: '5', branchName: 'Agence Lille Europe', score: 1, comment: 'Aucune prise en charge de ma demande. Renvoyé de guichet en guichet sans solution.', category: 'Service', sentiment: 'negative', clientName: 'Jean Leclerc', clientEmail: 'j.leclerc@email.com', clientPhone: '06 98 76 54 32', isProcessed: false, createdAt: '2026-03-02T12:00:00' },
  { id: '5', branchId: '1', branchName: 'Agence Paris Centre', score: 4, comment: 'Rapidité du service appréciable. Petit bémol sur l\'espace d\'attente.', category: 'Accueil', sentiment: 'positive', isProcessed: true, createdAt: '2026-03-02T09:15:00' },
  { id: '6', branchId: '4', branchName: 'Agence Bordeaux Lac', score: 3, comment: 'Service correct mais rien d\'exceptionnel. Manque de proactivité.', category: 'Service', sentiment: 'neutral', clientName: 'Sophie Blanc', isProcessed: false, createdAt: '2026-03-01T16:30:00' },
  { id: '7', branchId: '5', branchName: 'Agence Lille Europe', score: 2, comment: 'Personnel désagréable et peu disponible.', category: 'Personnel', sentiment: 'negative', isProcessed: false, createdAt: '2026-03-01T11:45:00' },
  { id: '8', branchId: '2', branchName: 'Agence Lyon Part-Dieu', score: 5, comment: 'Accueil chaleureux, dossier traité en un temps record.', category: 'Accueil', sentiment: 'positive', clientName: 'Luc Bernard', clientEmail: 'luc.b@email.com', isProcessed: true, createdAt: '2026-03-01T10:00:00' },
  { id: '9', branchId: '3', branchName: 'Agence Marseille Vieux-Port', score: 3, comment: 'La signalétique est confuse, difficile de trouver le bon guichet.', category: 'Environnement', sentiment: 'neutral', isProcessed: false, createdAt: '2026-02-28T14:20:00' },
  { id: '10', branchId: '6', branchName: 'Agence Nantes Atlantis', score: 5, comment: 'Parfait du début à la fin. Je recommande vivement cette agence.', category: 'Accueil', sentiment: 'positive', clientName: 'Claire Moreau', clientEmail: 'c.moreau@email.com', isProcessed: true, createdAt: '2026-02-28T09:00:00' },
];

export const mockCommonIssues: Record<string, import('@/types').CommonIssue[]> = {
  '1': [
    { label: 'Temps d\'attente', percentage: 15, count: 47 },
    { label: 'Accueil', percentage: 8, count: 25 },
    { label: 'Environnement', percentage: 5, count: 16 },
  ],
  '3': [
    { label: 'Temps d\'attente', percentage: 45, count: 89 },
    { label: 'Personnel', percentage: 20, count: 40 },
    { label: 'Environnement', percentage: 18, count: 36 },
    { label: 'Service', percentage: 12, count: 24 },
  ],
  '5': [
    { label: 'Service', percentage: 40, count: 70 },
    { label: 'Personnel', percentage: 30, count: 53 },
    { label: 'Temps d\'attente', percentage: 20, count: 35 },
    { label: 'Environnement', percentage: 10, count: 18 },
  ],
  default: [
    { label: 'Temps d\'attente', percentage: 30, count: 45 },
    { label: 'Personnel', percentage: 25, count: 38 },
    { label: 'Service', percentage: 22, count: 33 },
    { label: 'Environnement', percentage: 15, count: 23 },
    { label: 'Horaires', percentage: 8, count: 12 },
  ],
};

// Multi-branch satisfaction evolution data
export const mockSatisfactionByBranch = [
  { date: '01 Fév', 'Paris Centre': 4.5, 'Lyon Part-Dieu': 4.2, 'Marseille Vieux-Port': 4.0, 'Bordeaux Lac': 4.1, 'Lille Europe': 3.9, 'Nantes Atlantis': 4.1 },
  { date: '08 Fév', 'Paris Centre': 4.4, 'Lyon Part-Dieu': 4.3, 'Marseille Vieux-Port': 3.9, 'Bordeaux Lac': 4.0, 'Lille Europe': 3.8, 'Nantes Atlantis': 4.2 },
  { date: '15 Fév', 'Paris Centre': 4.6, 'Lyon Part-Dieu': 4.3, 'Marseille Vieux-Port': 4.1, 'Bordeaux Lac': 3.9, 'Lille Europe': 3.7, 'Nantes Atlantis': 4.3 },
  { date: '22 Fév', 'Paris Centre': 4.5, 'Lyon Part-Dieu': 4.4, 'Marseille Vieux-Port': 4.0, 'Bordeaux Lac': 3.8, 'Lille Europe': 3.6, 'Nantes Atlantis': 4.2 },
  { date: '01 Mar', 'Paris Centre': 4.7, 'Lyon Part-Dieu': 4.5, 'Marseille Vieux-Port': 4.2, 'Bordeaux Lac': 3.9, 'Lille Europe': 3.7, 'Nantes Atlantis': 4.4 },
  { date: '03 Mar', 'Paris Centre': 4.6, 'Lyon Part-Dieu': 4.4, 'Marseille Vieux-Port': 4.1, 'Bordeaux Lac': 3.9, 'Lille Europe': 3.7, 'Nantes Atlantis': 4.3 },
];

export const mockSentimentData = [
  { name: 'Très satisfait', value: 1420, color: 'hsl(164, 70%, 40%)' },
  { name: 'Satisfait', value: 1580, color: 'hsl(199, 89%, 36%)' },
  { name: 'Neutre', value: 520, color: 'hsl(38, 92%, 50%)' },
  { name: 'Insatisfait', value: 327, color: 'hsl(0, 72%, 51%)' },
];

export const mockSatisfactionData = [
  { month: 'Oct', score: 3.9, feedbacks: 580 },
  { month: 'Nov', score: 4.0, feedbacks: 620 },
  { month: 'Déc', score: 3.8, feedbacks: 540 },
  { month: 'Jan', score: 4.1, feedbacks: 670 },
  { month: 'Fév', score: 4.0, feedbacks: 710 },
  { month: 'Mar', score: 4.2, feedbacks: 727 },
];
