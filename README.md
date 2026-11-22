# Expert AI

Expert AI is a mobile-first AI workspace hosted on Railway, powered by the OpenAI API.

## Deployment
- Frontend: Vite + React mobile workspace, served by the Bun server.
- Backend: Railway Bun API in `backend/railway/index.ts`.
- Data: Railway PostgreSQL.
- User uploads: Railway S3-compatible bucket.
- AI provider: OpenAI Platform via the private `OPENAI_API_KEY` environment variable.

Set all credentials in the Railway service Variables panel. Never commit secrets to GitHub.

## Required Railway variables
`DATABASE_URL`, `OPENAI_API_KEY`, `APP_ORIGIN`, `PUBLIC_API_URL`, `INTEGRATION_ENCRYPTION_KEY`, `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_URL_STYLE`.

Optional Google, GitHub, Slack and Notion OAuth credentials are documented in `backend/railway/INTEGRATIONS.md`.
