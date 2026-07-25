import { app } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`Simple Recruit API listening on port ${PORT}`);
});
