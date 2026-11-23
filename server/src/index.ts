import { loadEnv } from './env.js';
import { createApp } from './app.js';

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
  console.log(`🌿 AirWise Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`Groq LLM Status: ${env.GROQ_API_KEY ? 'Active (' + env.GROQ_MODEL + ')' : 'Rule engine fallback mode (no GROQ_API_KEY)'}`);
});
