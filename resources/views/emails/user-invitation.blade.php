<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 0;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color:#0e7490; padding:28px 32px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">{{ $orgName }}</h1>
                            <p style="color:#cffafe; margin:6px 0 0; font-size:13px;">Plateforme Qualité & Satisfaction Client</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="color:#1e293b; font-size:18px; margin:0 0 16px;">Bienvenue {{ $fullName }} !</h2>

                            <p style="color:#475569; font-size:14px; line-height:1.6; margin:0 0 16px;">
                                Vous avez été invité(e) à rejoindre la plateforme <strong>{{ $orgName }}</strong> en tant que <strong>{{ $roleLabel }}</strong>.
                            </p>

                            <p style="color:#475569; font-size:14px; line-height:1.6; margin:0 0 24px;">
                                Voici vos identifiants de connexion :
                            </p>

                            <!-- Credentials box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa; border:1px solid #ccfbf1; border-radius:8px; margin:0 0 24px;">
                                <tr>
                                    <td style="padding:20px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="color:#64748b; font-size:12px; padding:4px 0; font-weight:600;">EMAIL</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#0e7490; font-size:15px; padding:2px 0 12px; font-weight:600;">{{ $userEmail }}</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#64748b; font-size:12px; padding:4px 0; font-weight:600;">MOT DE PASSE TEMPORAIRE</td>
                                            </tr>
                                            <tr>
                                                <td style="color:#0e7490; font-size:15px; padding:2px 0; font-weight:600; font-family:monospace; letter-spacing:1px;">{{ $tempPassword }}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding:0 0 24px;">
                                        <a href="{{ $loginUrl }}" style="display:inline-block; background-color:#0e7490; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:8px; font-size:14px; font-weight:600;">
                                            Se connecter
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color:#94a3b8; font-size:12px; line-height:1.6; margin:0; border-top:1px solid #e2e8f0; padding-top:16px;">
                                Nous vous recommandons de changer votre mot de passe après votre première connexion.
                                Si vous n'êtes pas à l'origine de cette invitation, ignorez cet email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc; padding:16px 32px; text-align:center; border-top:1px solid #e2e8f0;">
                            <p style="color:#94a3b8; font-size:11px; margin:0;">
                                {{ $orgName }} — Propulsé par QualiMoji
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
