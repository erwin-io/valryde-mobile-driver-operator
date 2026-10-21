// Dev-server proxy to the Agent A development API. Override with VALRYDE_API_URL (e.g. an isolated test instance).
export default {
  '/api': {
    target: process.env.VALRYDE_API_URL ?? 'http://127.0.0.1:3000',
    secure: false,
    logLevel: 'warn',
  },
};
