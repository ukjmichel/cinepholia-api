import { register } from 'ts-node';

register({
  esm: true,
  transpileOnly: true,
  experimentalSpecifierResolution: 'node',
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, fermeture...');
  setTimeout(() => process.exit(0), 3000);
});

await import('./src/server.ts');
