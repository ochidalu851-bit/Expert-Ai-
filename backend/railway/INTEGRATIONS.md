# Expert AI — Railway integrations

This folder contains the deployed Expert AI Railway API function and its integration setup notes.

## Production endpoints

- Web app: https://expert-ai-web-mxja-production.up.railway.app
- API: https://expert-ai-api-production.up.railway.app
- Health: https://expert-ai-api-production.up.railway.app/health

## OAuth callback URLs

Register the exact provider callback URL in each provider console:

| Provider | Callback URL |
|---|---|
| Google | https://expert-ai-api-production.up.railway.app/api/oauth/google/callback |
| GitHub | https://expert-ai-api-production.up.railway.app/api/oauth/github/callback |
| Slack | https://expert-ai-api-production.up.railway.app/api/oauth/slack/callback |
| Notion | https://expert-ai-api-production.up.railway.app/api/oauth/notion/callback |

## Railway API service variables

Required core settings: `DATABASE_URL`, `OPENAI_API_KEY`, `APP_ORIGIN`, `PUBLIC_API_URL`, the S3-compatible storage settings, and `INTEGRATION_ENCRYPTION_KEY`.

Provider OAuth credentials are configured separately:

- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Slack: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- Notion: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`

Keep all secrets in Railway's encrypted Variables panel. Never commit secret values to GitHub. The token-vault key must remain stable: changing it makes existing encrypted OAuth tokens unreadable, so rotate it only with a planned token reauthorization.

## Implemented connector operations

- Google Drive list, Gmail message listing, Gmail draft creation, Calendar event listing and creation.
- GitHub repository listing and issue creation.
- Slack channel listing and message posting.
- Notion search and page creation.

Users authorize each provider from their own Expert AI account. Connected OAuth tokens are encrypted before being stored in PostgreSQL. The catalogue must continue to show a provider as requiring credentials or connection until its real authorization flow succeeds.

## Deploy note

The API is currently maintained as a Railway Function. The GitHub copy is a versioned source snapshot; do not connect this folder as the Railway service root without converting the function to a repository-based service and verifying the build/start configuration first.
