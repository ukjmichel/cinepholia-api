export function getWelcomeTemplate(user: { firstName: string }) {
  return `
      <h1>Welcome, ${user.firstName}!</h1>
      <p>We're happy to have you on board. Enjoy using our app!</p>
      <p>If you have any questions, just reply to this email.</p>
    `;
}
