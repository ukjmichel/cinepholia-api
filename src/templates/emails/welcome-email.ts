export const welcomeEmailTemplate = (username: string): string => {
  return `
      <div style="font-family: Arial, sans-serif;">
        <h1>Bienvenue ${username} !</h1>
        <p>Merci de nous avoir rejoints sur <b>Cinepholia</b>.<br>
        Nous sommes heureux de vous compter parmi nous !</p>
        <hr>
        <p style="font-size:12px;color:#888;">
          L’équipe Cinepholia
        </p>
      </div>
    `;
};
