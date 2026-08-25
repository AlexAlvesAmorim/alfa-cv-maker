const URL_RE = /https?:\/\/[^\s<>")\]]+/i;
const READER_PREFIX = 'https://r.jina.ai/';
const PROXY_PREFIX = 'https://api.allorigins.win/raw?url=';
const MIN_POSTING_CHARS = 200;
const MAX_POSTING_CHARS = 20000;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_RE);
  return match ? match[0].replace(/[.,;:!?]+$/, '') : null;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|li|p|div|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

async function readViaTextReader(url: string): Promise<string> {
  const response = await fetchWithTimeout(`${READER_PREFIX}${url}`, 20000);
  if (!response.ok) throw new Error(`reader-${response.status}`);
  const raw = await response.text();
  const cleaned = raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (cleaned.length < MIN_POSTING_CHARS) throw new Error('reader-thin');
  return cleaned.slice(0, MAX_POSTING_CHARS);
}

async function readViaHtmlProxy(url: string): Promise<string> {
  const response = await fetchWithTimeout(`${PROXY_PREFIX}${encodeURIComponent(url)}`, 20000);
  if (!response.ok) throw new Error(`proxy-${response.status}`);
  const html = await response.text();
  const text = htmlToText(html);
  if (text.length < MIN_POSTING_CHARS) throw new Error('proxy-thin');
  return text.slice(0, MAX_POSTING_CHARS);
}

export async function fetchJobPostingText(rawUrl: string): Promise<string> {
  const url = rawUrl.trim();
  const readers = [readViaTextReader, readViaHtmlProxy];
  let lastError: unknown = null;
  for (const read of readers) {
    try {
      return await read(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('all-readers-failed');
}

export async function resolveJobDescription(input: string): Promise<string> {
  const url = extractFirstUrl(input);
  if (!url || input.trim().replace(URL_RE, '').trim().length > 120) return input;
  return fetchJobPostingText(url);
}
