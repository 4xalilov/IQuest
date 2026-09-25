/** Telegram Bot API ustida yupqa qatlam. Testlarda globalThis.fetch mock qilinadi. */
export class BotApiError extends Error {
  constructor(public method: string, public description: string) { super(`${method}: ${description}`); }
}

export async function callBotApi<T = unknown>(token: string, method: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const body = (await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }))) as { ok: boolean; result?: T; description?: string };
  if (!body.ok) throw new BotApiError(method, body.description ?? 'unknown');
  return body.result as T;
}
