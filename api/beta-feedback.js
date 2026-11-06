const GITHUB_API_URL = "https://api.github.com";
const DEFAULT_REPOSITORY = "fredpineau/chelie_game";
const MAX_REQUEST_BYTES = 16_000;
const MAX_CONTENT_LENGTH = 8_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const rateLimits = new Map();
let labelsReady = false;

const LABELS = {
  "beta-feedback": {
    color: "6b4c78",
    description: "Retour envoyé depuis l’Espace Bêta du jeu",
  },
  bug: {
    color: "d73a4a",
    description: "Un problème empêche le jeu de fonctionner comme prévu",
  },
  "beta-survey": {
    color: "2f7180",
    description: "Réponse au questionnaire de bêta-test",
  },
};

function setCorsHeaders(request, response) {
  const origin = String(request.headers.origin ?? "");
  const allowedOrigin = origin === "http://localhost"
    || origin === "https://localhost"
    || origin === "capacitor://localhost"
    || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  if (allowedOrigin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Vary", "Origin");
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "unknown")
    .split(",")[0]
    .trim();
}

function isRateLimited(request) {
  const now = Date.now();
  const key = getClientIp(request);
  const previous = rateLimits.get(key);
  const current = !previous || now - previous.startedAt >= RATE_LIMIT_WINDOW_MS
    ? { startedAt: now, count: 1 }
    : { ...previous, count: previous.count + 1 };
  rateLimits.set(key, current);

  if (rateLimits.size > 500) {
    for (const [storedKey, value] of rateLimits) {
      if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) rateLimits.delete(storedKey);
    }
  }
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function parseBody(request) {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body;
}

function parseRepository(value) {
  const repository = value || DEFAULT_REPOSITORY;
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(repository);
  return match ? { owner: match[1], repo: match[2] } : null;
}

async function githubRequest(path, token, options = {}) {
  return fetch(`${GITHUB_API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "chelie-carnivore-garden-beta-feedback",
      ...(options.headers ?? {}),
    },
  });
}

async function ensureLabels(owner, repo, token) {
  if (labelsReady) return;
  for (const [name, definition] of Object.entries(LABELS)) {
    const response = await githubRequest(`/repos/${owner}/${repo}/labels`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...definition }),
    });
    if (!response.ok && response.status !== 422) {
      throw new Error(`github-label-${response.status}`);
    }
  }
  labelsReady = true;
}

export default async function handler(request, response) {
  setCorsHeaders(request, response);
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return response.status(405).json({ error: "method_not_allowed" });

  const contentLength = Number(request.headers["content-length"] ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return response.status(413).json({ error: "payload_too_large" });
  if (isRateLimited(request)) return response.status(429).json({ error: "too_many_requests" });

  let body;
  try {
    body = parseBody(request);
  } catch {
    return response.status(400).json({ error: "invalid_json" });
  }

  const kind = body?.kind;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim().slice(0, 500) : "Non précisée";
  if ((kind !== "bug" && kind !== "survey") || !title || content.length < 20 || content.length > MAX_CONTENT_LENGTH) {
    return response.status(400).json({ error: "invalid_feedback" });
  }

  const token = process.env.GITHUB_FEEDBACK_TOKEN;
  const repository = parseRepository(process.env.GITHUB_FEEDBACK_REPOSITORY);
  if (!token || !repository) {
    console.error("Configuration GitHub manquante pour les retours bêta.");
    return response.status(503).json({ error: "feedback_unavailable" });
  }

  const labels = ["beta-feedback", kind === "bug" ? "bug" : "beta-survey"];
  const issueBody = [
    content,
    "",
    "---",
    `Source : ${sourceUrl}`,
    `Réception serveur : ${new Date().toISOString()}`,
  ].join("\n");

  try {
    await ensureLabels(repository.owner, repository.repo, token);
    const githubResponse = await githubRequest(`/repos/${repository.owner}/${repository.repo}/issues`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `[Bêta] ${title}`, body: issueBody, labels }),
    });
    if (!githubResponse.ok) throw new Error(`github-issue-${githubResponse.status}`);
    const issue = await githubResponse.json();
    return response.status(201).json({ received: true, issueNumber: issue.number });
  } catch (error) {
    console.error("Création de l’Issue GitHub impossible.", error);
    return response.status(502).json({ error: "feedback_delivery_failed" });
  }
}
