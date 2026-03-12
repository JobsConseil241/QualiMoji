<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QualiMoji - Notification</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f6f9; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #1B4F72; padding: 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .content { padding: 32px 24px; }
        .alert-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .alert-badge.high { background-color: #fde8e8; color: #dc2626; }
        .alert-badge.medium { background-color: #fef3cd; color: #d97706; }
        .alert-badge.low { background-color: #d1fae5; color: #059669; }
        .info-box { background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
        .footer { background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>QualiMoji</h1>
        </div>
        <div class="content">
            @if($type === 'negative_spike')
                <h2>Alerte: Pic d'avis négatifs</h2>
                <span class="alert-badge high">Urgence élevée</span>
                <div class="info-box">
                    <p><strong>Point de vente:</strong> {{ $branch->name ?? 'N/A' }}</p>
                    <p><strong>Nombre d'avis négatifs:</strong> {{ $data['count'] ?? 'N/A' }}</p>
                    <p><strong>Période:</strong> Dernières {{ $data['period'] ?? '24' }} heures</p>
                </div>
                <p>Un nombre inhabituellement élevé d'avis négatifs a été détecté. Nous vous recommandons d'investiguer rapidement.</p>
            @elseif($type === 'satisfaction_drop')
                <h2>Alerte: Baisse de satisfaction</h2>
                <span class="alert-badge medium">Attention</span>
                <div class="info-box">
                    <p><strong>Point de vente:</strong> {{ $branch->name ?? 'N/A' }}</p>
                    <p>Le taux de satisfaction a significativement baissé.</p>
                </div>
            @elseif($type === 'scheduled_report')
                <h2>Rapport planifié: {{ $data['schedule_name'] ?? '' }}</h2>
                <div class="info-box">
                    <p><strong>Période:</strong> {{ $data['period_start'] ?? '' }} - {{ $data['period_end'] ?? '' }}</p>
                </div>
                <p>Votre rapport planifié est disponible.</p>
            @else
                <h2>Notification</h2>
                <p>{{ $data['message'] ?? 'Une nouvelle notification est disponible.' }}</p>
            @endif
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement par QualiMoji.</p>
            <p>Vous recevez cet email car vous avez activé les notifications.</p>
        </div>
    </div>
</body>
</html>
