export function resetPasswordEmailTemplate(
  username: string,
  code: string
): string {
  return `
      <div style="font-family: Arial, sans-serif;">
        <h1>Bonjour ${username},</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur <b>Cinepholia</b>.</p>
        <p>
          Voici votre code de réinitialisation :
        </p>
        <div style="font-size: 22px; font-weight: bold; margin: 16px 0; color: #5c67f2;">
          ${code}
        </div>
        <p>Ce code est valable pendant 15mn.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
        <hr>
        <p style="font-size:12px;color:#888;">
          L’équipe Cinepholia
        </p>
      </div>
    `;
}
