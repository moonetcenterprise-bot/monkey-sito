const env = require('./config/env');
const createApp = require('./app');

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Monkey backend in ascolto su http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
