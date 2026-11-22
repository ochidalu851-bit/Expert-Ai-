import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

const SESSION_KEY = 'expertAI:railwaySession';
const API_ORIGIN = String(import.meta.env.VITE_EXPERT_API_ORIGIN || '').replace(/\/+$/, '');
const apiUrl = (path: string) => /^https?:\/\//i.test(path) ? path : (API_ORIGIN + (path.startsWith('/') ? path : '/' + path));
async function railwayRequest(path: string, method = 'GET', body?: unknown) {
  const headers = new Headers({ accept: 'application/json' });
  const token = localStorage.getItem(SESSION_KEY);
  if (token) headers.set('authorization', 'Bearer ' + token);
  if (body !== undefined) headers.set('content-type', 'application/json');
  const response = await fetch(apiUrl(path), { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = new Error(String(data?.error || 'The Expert AI service request failed.')) as Error & { status?: number };
    reason.status = response.status;
    throw reason;
  }
  return data;
}
const api = {
  get: async (path: string) => ({ data: await railwayRequest(path) }),
  post: async (path: string, body?: unknown) => ({ data: await railwayRequest(path, 'POST', body ?? {}) }),
  put: async (path: string, body?: unknown) => ({ data: await railwayRequest(path, 'PUT', body ?? {}) }),
  delete: async (path: string) => ({ data: await railwayRequest(path, 'DELETE') }),
};
const auth = {
  async getUser() {
    if (!localStorage.getItem(SESSION_KEY)) return null;
    try {
      const result = await railwayRequest('/api/me');
      const raw = result?.user;
      return raw ? { userId: String(raw.id || raw.userId || ''), email: String(raw.email || ''), name: String(raw.name || String(raw.email || '').split('@')[0]), picture: raw.picture || undefined, scope: 'railway' } : null;
    } catch (reason) {
      if ((reason as { status?: number })?.status === 401) { localStorage.removeItem(SESSION_KEY); return null; }
      throw reason;
    }
  },
  async signOut() {
    try { await railwayRequest('/api/auth/logout', 'POST', {}); }
    finally { localStorage.removeItem(SESSION_KEY); }
  },
};
const notifications = {
  onMessage(_callback: (payload: any) => void) { return () => {}; },
  async subscribe() {
    if (!('Notification' in window)) return { enabled: false, supported: false, localOnly: true };
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    return { enabled: permission === 'granted', supported: true, permission, localOnly: true };
  },
  async getEnvironment() {
    const permission = 'Notification' in window ? Notification.permission : 'unsupported';
    return { enabled: permission === 'granted', supported: permission !== 'unsupported', permission, localOnly: true };
  },
  async unsubscribe() { return { ok: true, localOnly: true, note: 'Browser notification permission is managed in site settings.' }; },
};

type AuthUser = {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
  scope: string;
};
type SavedLoginAccount = {
  email: string;
  name?: string;
};
type FrameMessage = {
  app?: string;
  type?: string;
  requestId?: string;
  action?: string;
  payload?: Record<string, unknown>;
};

const APP = 'nexa-mobile-ui';

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [lastAccount, setLastAccount] = useState<SavedLoginAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const sendToFrame = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const cached = localStorage.getItem('expertAI:lastLoginAccount');
      if (cached) {
        const parsed = JSON.parse(cached) as SavedLoginAccount;
        if (parsed && typeof parsed.email === 'string' && parsed.email.includes('@')) { setLastAccount(parsed); setAuthEmail(parsed.email); }
      }
    } catch {
      // Ignore an unavailable or malformed saved-account display value.
    }
    auth.getUser()
      .then(restored => {
        if (!active) return;
        setUser(restored as AuthUser | null);
        if (restored?.email) {
          const saved = { email: restored.email, name: restored.name || restored.email.split('@')[0] };
          localStorage.setItem('expertAI:lastLoginAccount', JSON.stringify(saved));
          setLastAccount(saved);
        }
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not restore your Expert AI account session.');
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return;

    const stopPushListener = notifications.onMessage(payload => {
      const item = 'notification' in payload ? payload.notification : null;
      sendToFrame({
        app: APP,
        type: 'push-message',
        payload: {
          title: item?.title || 'Expert AI',
          body: item?.body || 'You have a new Expert AI notification.',
          url: item?.url || '/',
        },
      });
    });

    const safeGet = async (path: string) => {
      try {
        const result = await api.get(path);
        return result.data;
      } catch {
        return null;
      }
    };

    const onMessage = async (event: MessageEvent<FrameMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.app !== APP) return;

      if (message.type === 'ready') {
        const [projects, chats, files, integrations, preferences] = await Promise.all([
          safeGet('/api/projects'),
          safeGet('/api/chats'),
          safeGet('/api/files'),
          safeGet('/api/integrations'),
          safeGet('/api/preferences'),
        ]);
        const query = new URLSearchParams(window.location.search);
        const connected = query.get('connected');
        const integrationError = query.get('integration_error');
        if (connected || integrationError) window.history.replaceState({}, '', window.location.pathname);
        sendToFrame({
          app: APP,
          type: 'host-init',
          user: { userId: user.userId, email: user.email, name: user.name, picture: user.picture },
          projects: projects?.items || [],
          chats: chats?.items || [],
          files: files?.items || [],
          integrations: integrations?.items || [],
          preferences: preferences?.preferences || {},
          notice: connected ? connected + ' connected successfully.' : integrationError ? 'Connection was not completed: ' + integrationError : '',
        });
        return;
      }

      if (message.type !== 'request' || !message.requestId || !message.action) return;
      const payload = message.payload || {};
      try {
        let data: unknown = {};
        switch (message.action) {
          case 'chat.send':
            data = (await api.post('/api/chat', {
              message: String(payload.message || ''),
              chatId: payload.chatId || null,
              thinkingMode: payload.thinkingMode === 'DEEP' ? 'DEEP' : 'FAST',
              responseMode: ['LIVE', 'ADVANCED', 'STANDARD'].includes(String(payload.responseMode || '')) ? String(payload.responseMode) : 'STANDARD',
              taskMode: payload.taskMode === 'STUDY' ? 'STUDY' : 'NORMAL',
              retryLastAssistant: payload.retryLastAssistant === true,
              editUserMessageIndex: Number.isInteger(payload.editUserMessageIndex) ? Number(payload.editUserMessageIndex) : undefined,
              messages: Array.isArray(payload.messages) ? payload.messages : undefined,
              contextMessages: Array.isArray(payload.contextMessages) ? payload.contextMessages : undefined,
              attachmentIds: Array.isArray(payload.attachmentIds) ? payload.attachmentIds : [],
              temporary: payload.temporary === true,
            })).data;
            break;
          case 'chats.open':
            data = (await api.get('/api/chats/' + encodeURIComponent(String(payload.id || '')))).data;
            break;
          case 'chats.delete':
            data = (await api.delete('/api/chats/' + encodeURIComponent(String(payload.id || '')))).data;
            break;
          case 'projects.create':
            data = (await api.post('/api/projects', {
              name: String(payload.name || ''),
              description: String(payload.description || ''),
            })).data;
            break;
          case 'projects.update':
            data = (await api.put('/api/projects/' + encodeURIComponent(String(payload.id || '')), payload)).data;
            break;
          case 'projects.delete':
            data = (await api.delete('/api/projects/' + encodeURIComponent(String(payload.id || '')))).data;
            break;
          case 'files.upload':
            data = (await api.post('/api/files', {
              name: String(payload.name || 'upload.bin'),
              contentType: String(payload.contentType || 'application/octet-stream'),
              size: Number(payload.size || 0),
              contentBase64: String(payload.contentBase64 || ''),
              temporary: payload.temporary === true,
            })).data;
            break;
          case 'image.generate':
            data = (await api.post('/api/images', { prompt: String(payload.prompt || '') })).data;
            break;
          case 'research.url':
            data = (await api.post('/api/research', { url: String(payload.url || '') })).data;
            break;
          case 'web.search':
            data = (await api.post('/api/search', { query: String(payload.query || '') })).data;
            break;
          case 'research.deep':
            data = (await api.post('/api/research/deep', { query: String(payload.query || '') })).data;
            break;
          case 'integrations.connect': {
            const provider = String(payload.provider || '');
            if (!['google', 'github', 'slack', 'notion'].includes(provider)) throw new Error('This provider does not support live OAuth in this app.');
            const redirectUri = apiUrl('/api/oauth/' + provider + '/callback');
            const result = (await api.post('/api/integrations/' + provider + '/start', { redirectUri })).data;
            const authorizationUrl = String(result.authorizationUrl || '');
            if (!authorizationUrl) throw new Error('The provider did not return an authorization URL.');
            window.location.assign(authorizationUrl);
            data = { redirecting: true };
            break;
          }
          case 'integrations.disconnect':
            data = (await api.post('/api/integrations/' + encodeURIComponent(String(payload.provider || '')) + '/disconnect', {})).data;
            break;
          case 'integrations.list':
            data = (await api.get('/api/integrations')).data;
            break;
          case 'openai.test':
            data = (await api.post('/api/openai/test', {})).data;
            break;
          case 'connectors.google.drive':
            data = (await api.get('/api/connectors/google/drive')).data;
            break;
          case 'connectors.google.gmail':
            data = (await api.get('/api/connectors/google/gmail')).data;
            break;
          case 'connectors.github.repos':
            data = (await api.get('/api/connectors/github/repos')).data;
            break;
          case 'connectors.slack.channels':
            data = (await api.get('/api/connectors/slack/channels')).data;
            break;
          case 'connectors.notion.search':
            data = (await api.post('/api/connectors/notion/search', { query: String(payload.query || '') })).data;
            break;
          case 'notifications.enable': {
            const subscription = await notifications.subscribe({ showUi: false });
            const environment = await notifications.getEnvironment();
            data = { ...subscription, ...environment };
            break;
          }
          case 'notifications.disable': {
            await notifications.unsubscribe({ showUi: false });
            const environment = await notifications.getEnvironment();
            data = { ok: true, ...environment };
            break;
          }
          case 'notifications.status':
            data = await notifications.getEnvironment();
            break;
          case 'notifications.test':
            if (!('Notification' in window) || Notification.permission !== 'granted') throw new Error('Allow browser notifications first. Remote push delivery is not configured on this Railway migration yet.');
            new Notification('Expert AI', { body: 'Your browser notifications are working.', icon: '/expert-ai-icon.svg' });
            data = { shown: true, localOnly: true };
            break;
          case 'notifications.show': {
            if (!('Notification' in window) || Notification.permission !== 'granted') throw new Error('Notification permission is not enabled.');
            const body = String(payload.body || '').slice(0, 180);
            if ('serviceWorker' in navigator) {
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification('Expert AI', { body, icon: '/expert-ai-icon.svg', badge: '/expert-ai-icon.svg' });
              data = { shown: true };
            } else {
              new Notification('Expert AI', { body, icon: '/expert-ai-icon.svg' });
              data = { shown: true };
            }
            break;
          }
          case 'family.list':
            data = (await api.get('/api/family')).data;
            break;
          case 'family.create':
            data = (await api.post('/api/family/invites', { role: payload.role === 'child' ? 'child' : 'member' })).data;
            break;
          case 'family.join':
            data = (await api.post('/api/family/join', { code: String(payload.code || '') })).data;
            break;
          case 'family.controls':
            data = (await api.put('/api/family/controls/' + encodeURIComponent(String(payload.memberId || '')), {
              safe_mode: payload.safe_mode !== false,
              allow_images: payload.allow_images === true,
            })).data;
            break;
          case 'voice.synthesize':
            data = (await api.post('/api/voice/synthesize', {
              text: String(payload.text || ''),
              voiceId: String(payload.voiceId || ''),
            })).data;
            break;
          case 'preferences.load':
            data = (await api.get('/api/preferences')).data;
            break;
          case 'preferences.save':
            data = (await api.put('/api/preferences', { preferences: payload.preferences || {} })).data;
            break;
          case 'identity.signout':
            await auth.signOut();
            setUser(null);
            data = { signedOut: true };
            break;
          default:
            throw new Error('This action is not connected to a live service yet.');
        }
        sendToFrame({ app: APP, type: 'response', requestId: message.requestId, ok: true, data });
      } catch (reason) {
        const messageText = reason instanceof Error ? reason.message : 'The live service request failed.';
        sendToFrame({ app: APP, type: 'response', requestId: message.requestId, ok: false, error: messageText });
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      stopPushListener();
    };
  }, [user, sendToFrame]);

  const signIn = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSigningIn(true); setError('');
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const result = await api.post(endpoint, { email: authEmail.trim(), password: authPassword });
      const payload = result.data;
      if (!payload?.access_token || !payload?.user?.id) throw new Error('The Railway server did not return a valid account session.');
      localStorage.setItem(SESSION_KEY, String(payload.access_token));
      const signedIn: AuthUser = { userId: String(payload.user.id), email: String(payload.user.email || authEmail.trim()), name: String(payload.user.name || String(payload.user.email || authEmail).split('@')[0]), scope: 'railway' };
      const saved = { email: signedIn.email || authEmail.trim(), name: signedIn.name };
      localStorage.setItem('expertAI:lastLoginAccount', JSON.stringify(saved));
      setLastAccount(saved); setUser(signedIn); setAuthPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your account request could not be completed.');
    } finally { setSigningIn(false); }
  };

  if (booting) {
    return (
      <main className="expert-state" aria-label="Expert AI loading">
        <div className="expert-state-brand">
          <span className="expert-state-mark" aria-hidden="true">✳</span>
          <strong>Expert AI</strong>
        </div>
      </main>
    );
  }

  const accountInitial = (lastAccount?.name || lastAccount?.email || 'AI')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  if (!user) {
    return (
      <main className="expert-login-screen">
        <section className="expert-login-brand" aria-label="Expert AI">
          <span className="expert-login-symbol" aria-hidden="true">✳</span>
          <strong>Expert AI</strong>
        </section>
        <form className="expert-login-form" onSubmit={signIn}>
          <h1>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p>Sign in to your Expert AI workspace.</p>
          <label htmlFor="expert-login-email">Email address</label>
          <input id="expert-login-email" type="email" autoComplete="email" inputMode="email" required value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="name@example.com" />
          <label htmlFor="expert-login-password">Password</label>
          <input id="expert-login-password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={authMode === 'signup' ? 10 : 1} required value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder={authMode === 'signup' ? 'At least 10 characters' : 'Enter your password'} />
          {error ? <p className="expert-login-error" role="alert">{error}</p> : null}
          <button type="submit" className="expert-login-submit" disabled={signingIn}>{signingIn ? 'Connecting securely…' : authMode === 'signup' ? 'Create account' : 'Continue'}</button>
          <button type="button" className="expert-login-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); }} disabled={signingIn}>{authMode === 'login' ? 'Create a new account' : 'I already have an account'}</button>
          <small className="expert-login-note">Email and password sign-in. No SMS or email verification is required.</small>
          {lastAccount?.email ? <small className="expert-login-note">Last account: {lastAccount.email}</small> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="expert-app">
      <iframe
        ref={frameRef}
        className="expert-mobile-app"
        src="/mobile-ui-pack/index.html?v=expert-4"
        title="Expert AI"
        allow="camera; microphone; clipboard-read; clipboard-write; geolocation; web-share"
      />
    </main>
  );
}

export default App;
