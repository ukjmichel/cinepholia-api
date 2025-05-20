// pm2-wrapper.js
require('ts-node').register();
require('./src/server.ts');

// Handle shutdown gracefully before loading server
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  // Your server will have a chance to clean up in its own SIGINT handler
  setTimeout(() => {
    console.log('Clean exit from PM2 wrapper');
    process.exit(0);
  }, 5000);
});

// Load the server
require('./src/server.ts');