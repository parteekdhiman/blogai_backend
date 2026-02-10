import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Ensure Sentry is initialized before everything else
Sentry.init({
  dsn: "https://60fe5928bbd63e3643d63d17b06b056e@o4510759456342016.ingest.de.sentry.io/4510763488903248",
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  
  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: 1.0,
  
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: 'trace',
  
  // Send structured logs to Sentry
  enableLogs: true,
  
  // Setting this option to true will send default PII data to Sentry.
  sendDefaultPii: true,
});
