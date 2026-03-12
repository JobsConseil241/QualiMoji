import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ReportData {
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: { start: Date; end: Date };
  generatedAt: Date;
  summary: {
    totalFeedbacks: number;
    averageSatisfaction: number;
    satisfactionTrend: number;
    totalAlerts: number;
    positiveRate: number;
    negativeRate: number;
  };
  branches?: {
    name: string;
    satisfaction: number;
    feedbacks: number;
    alerts: number;
    trend: number;
  }[];
  feedbacks?: {
    date: string;
    branch: string;
    score: number;
    sentiment: string;
    comment: string;
    category: string;
  }[];
  alerts?: {
    date: string;
    branch: string;
    type: string;
    message: string;
    status: string;
  }[];
  sentimentBreakdown?: {
    label: string;
    count: number;
    percentage: number;
  }[];
}

export interface ReportHistoryEntry {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  period: string;
  format: 'excel' | 'pdf';
}

/* ─── Excel ─── */
export function exportToExcel(data: ReportData, filename: string) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    ['Rapport', data.title],
    ['Période', `${format(data.period.start, 'dd/MM/yyyy')} - ${format(data.period.end, 'dd/MM/yyyy')}`],
    ['Généré le', format(data.generatedAt, 'dd/MM/yyyy HH:mm', { locale: fr })],
    [],
    ['RÉSUMÉ'],
    ['Total feedbacks', data.summary.totalFeedbacks],
    ['Satisfaction moyenne', `${data.summary.averageSatisfaction}/5`],
    ['Tendance', `${data.summary.satisfactionTrend > 0 ? '+' : ''}${data.summary.satisfactionTrend}%`],
    ['Alertes', data.summary.totalAlerts],
    ['Taux positif', `${data.summary.positiveRate}%`],
    ['Taux négatif', `${data.summary.negativeRate}%`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  // Branches sheet
  if (data.branches?.length) {
    const branchHeader = ['Agence', 'Satisfaction', 'Feedbacks', 'Alertes', 'Tendance (%)'];
    const branchRows = data.branches.map((b) => [b.name, b.satisfaction, b.feedbacks, b.alerts, b.trend]);
    const wsBranches = XLSX.utils.aoa_to_sheet([branchHeader, ...branchRows]);
    wsBranches['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsBranches, 'Agences');
  }

  // Feedbacks sheet
  if (data.feedbacks?.length) {
    const fbHeader = ['Date', 'Agence', 'Score', 'Sentiment', 'Catégorie', 'Commentaire'];
    const fbRows = data.feedbacks.map((f) => [f.date, f.branch, f.score, f.sentiment, f.category, f.comment]);
    const wsFb = XLSX.utils.aoa_to_sheet([fbHeader, ...fbRows]);
    wsFb['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsFb, 'Feedbacks');
  }

  // Alerts sheet
  if (data.alerts?.length) {
    const aHeader = ['Date', 'Agence', 'Type', 'Message', 'Statut'];
    const aRows = data.alerts.map((a) => [a.date, a.branch, a.type, a.message, a.status]);
    const wsAlerts = XLSX.utils.aoa_to_sheet([aHeader, ...aRows]);
    wsAlerts['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 50 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertes');
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/* ─── PDF ─── */
export function exportToPDF(data: ReportData, template: 'daily' | 'weekly' | 'monthly' | 'custom') {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(14, 116, 144); // primary color
  doc.rect(0, 0, pageW, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('QualityHub', 15, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Feedback Rating Solution', 15, 22);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, pageW - 15, 15, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${format(data.period.start, 'dd MMM yyyy', { locale: fr })} — ${format(data.period.end, 'dd MMM yyyy', { locale: fr })}`,
    pageW - 15, 22, { align: 'right' }
  );
  doc.text(`Généré le ${format(data.generatedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageW - 15, 29, { align: 'right' });

  y = 45;
  doc.setTextColor(30, 41, 59);

  // Executive Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé Exécutif', 15, y);
  y += 8;

  const summaryItems = [
    ['Total feedbacks', String(data.summary.totalFeedbacks)],
    ['Satisfaction moyenne', `${data.summary.averageSatisfaction}/5`],
    ['Tendance', `${data.summary.satisfactionTrend > 0 ? '+' : ''}${data.summary.satisfactionTrend}%`],
    ['Alertes actives', String(data.summary.totalAlerts)],
    ['Taux positif', `${data.summary.positiveRate}%`],
    ['Taux négatif', `${data.summary.negativeRate}%`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: summaryItems,
    theme: 'grid',
    headStyles: { fillColor: [14, 116, 144], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto',
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Sentiment breakdown
  if (data.sentimentBreakdown?.length) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Répartition des sentiments', 15, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Sentiment', 'Nombre', 'Pourcentage']],
      body: data.sentimentBreakdown.map((s) => [s.label, String(s.count), `${s.percentage}%`]),
      theme: 'grid',
      headStyles: { fillColor: [14, 116, 144], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Branches table
  if (data.branches?.length) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Détail par agence', 15, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Agence', 'Score', 'Feedbacks', 'Alertes', 'Tendance']],
      body: data.branches.map((b) => [
        b.name,
        `${b.satisfaction}/5`,
        String(b.feedbacks),
        String(b.alerts),
        `${b.trend > 0 ? '+' : ''}${b.trend}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [14, 116, 144], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Feedbacks
  if (data.feedbacks?.length) {
    if (y > 180) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Liste des feedbacks', 15, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Agence', 'Score', 'Sentiment', 'Commentaire']],
      body: data.feedbacks.slice(0, 50).map((f) => [f.date, f.branch, String(f.score), f.sentiment, f.comment.substring(0, 80)]),
      theme: 'striped',
      headStyles: { fillColor: [14, 116, 144], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 15, right: 15 },
      columnStyles: { 4: { cellWidth: 60 } },
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Alerts
  if (data.alerts?.length) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Alertes de la période', 15, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Agence', 'Type', 'Message']],
      body: data.alerts.map((a) => [a.date, a.branch, a.type, a.message]),
      theme: 'striped',
      headStyles: { fillColor: [14, 116, 144], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `QualityHub — Rapport confidentiel — Page ${i}/${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`${data.title.replace(/\s+/g, '_')}.pdf`);
}

/* ─── Build report data from mock ─── */
export function buildReportData(
  title: string,
  type: ReportData['type'],
  periodStart: Date,
  periodEnd: Date,
  mockData: {
    mockBranches: any[];
    mockFeedbacks: any[];
    mockAlerts: any[];
    mockSentimentData: any[];
  },
  options?: {
    includeBranches?: boolean;
    includeFeedbacks?: boolean;
    includeAlerts?: boolean;
    includeCharts?: boolean;
    branchIds?: string[];
    sentiments?: string[];
  }
): ReportData {
  const { mockBranches, mockFeedbacks, mockAlerts, mockSentimentData } = mockData;

  const filteredBranches = options?.branchIds?.length
    ? mockBranches.filter((b: any) => options.branchIds!.includes(b.id))
    : mockBranches;

  const filteredFeedbacks = mockFeedbacks.filter((f: any) => {
    if (options?.branchIds?.length && !options.branchIds.includes(f.branchId)) return false;
    if (options?.sentiments?.length && !options.sentiments.includes(f.sentiment)) return false;
    return true;
  });

  const totalFb = filteredFeedbacks.length;
  const posCount = filteredFeedbacks.filter((f: any) => f.sentiment === 'positive').length;
  const negCount = filteredFeedbacks.filter((f: any) => f.sentiment === 'negative').length;

  return {
    title,
    type,
    period: { start: periodStart, end: periodEnd },
    generatedAt: new Date(),
    summary: {
      totalFeedbacks: totalFb,
      averageSatisfaction: 4.2,
      satisfactionTrend: 3.5,
      totalAlerts: mockAlerts.length,
      positiveRate: totalFb ? Math.round((posCount / totalFb) * 100) : 0,
      negativeRate: totalFb ? Math.round((negCount / totalFb) * 100) : 0,
    },
    branches: options?.includeBranches !== false
      ? filteredBranches.map((b: any) => ({
          name: b.name,
          satisfaction: b.satisfactionScore,
          feedbacks: b.totalFeedbacks,
          alerts: b.activeAlerts,
          trend: b.trendValue || 0,
        }))
      : undefined,
    feedbacks: options?.includeFeedbacks !== false
      ? filteredFeedbacks.map((f: any) => ({
          date: format(new Date(f.createdAt), 'dd/MM/yyyy'),
          branch: f.branchName,
          score: f.score,
          sentiment: f.sentiment === 'positive' ? 'Positif' : f.sentiment === 'negative' ? 'Négatif' : 'Neutre',
          comment: f.comment,
          category: f.category,
        }))
      : undefined,
    alerts: options?.includeAlerts !== false
      ? mockAlerts.map((a: any) => ({
          date: format(new Date(a.createdAt), 'dd/MM/yyyy'),
          branch: a.branchName,
          type: a.type === 'critical' ? 'Critique' : a.type === 'warning' ? 'Attention' : 'Info',
          message: a.message,
          status: a.isRead ? 'Lu' : 'Non lu',
        }))
      : undefined,
    sentimentBreakdown: mockSentimentData.map((s: any) => ({
      label: s.name,
      count: s.value,
      percentage: Math.round((s.value / mockSentimentData.reduce((acc: number, x: any) => acc + x.value, 0)) * 100),
    })),
  };
}
