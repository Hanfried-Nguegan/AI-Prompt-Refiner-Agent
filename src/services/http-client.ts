/**
 * HTTP client for webhook communication
 */

import http from 'http';
import https from 'https';
import type { WebhookResponse, RefinerConfig } from '../types/index.js';
import { RefinerError, RefineErrorCode } from '../types/index.js';
import {
  normalizeOutput,
  findFirstNonEmptyString,
  calculateBackoffDelay,
  sleep,
} from '../utils/index.js';

// Reusable HTTP/HTTPS agents with explicit long timeouts to avoid premature socket closure
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  timeout: 0, // Disable agent timeout completely
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  timeout: 0, // Disable agent timeout completely
});

export interface HttpClientOptions {
  timeoutMs: number;
  signal?: AbortSignal;
}

/**
 * Make a POST request with timeout support
 */
async function httpPost(
  url: string,
  body: unknown,
  options: HttpClientOptions
): Promise<{ status: number; body: string }> {
  const controller = new AbortController();
  const startTime = Date.now();

  // If an external signal was provided, forward its abort to our controller
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  // Debug info to help diagnose timeouts
  console.debug('[httpPost] POST', url, 'timeoutMs=', options.timeoutMs);

  try {
    // Dynamic import for node-fetch (ESM compatibility)
    const { default: fetch } = await import('node-fetch');

    const fetchStartTime = Date.now();
    // Use https agent for https URLs, http agent for http URLs
    const agent = url.startsWith('https') ? httpsAgent : httpAgent;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      agent,
      signal: controller.signal,
    });

    const fetchDuration = Date.now() - fetchStartTime;
    console.debug(
      `[httpPost] Response received after ${fetchDuration}ms, status=${response.status}`
    );

    const textStartTime = Date.now();
    const textBody = await response.text();
    const textDuration = Date.now() - textStartTime;

    const totalDuration = Date.now() - startTime;
    console.debug(
      `[httpPost] Body read in ${textDuration}ms. Total: ${totalDuration}ms, body length: ${textBody.length}`
    );

    return {
      status: response.status,
      body: textBody,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if an error is an abort error
 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && /aborted|The operation was aborted/i.test(error.message);
}

/**
 * Check if response indicates rate limiting
 */
function isRateLimited(status: number, body: string): boolean {
  return status === 429 || /rate limit/i.test(body);
}

/**
 * Extract refined prompt from webhook response
 */
function extractRefinedPrompt(responseBody: string): string {
  if (!responseBody) {
    throw new RefinerError('Empty response from webhook', RefineErrorCode.EMPTY_RESPONSE);
  }

  let data: unknown;
  try {
    data = JSON.parse(responseBody);
  } catch {
    throw new RefinerError('Invalid JSON response from webhook', RefineErrorCode.INVALID_RESPONSE);
  }

  // Handle array response (take first element)
  const responseObj = Array.isArray(data) ? data[0] : data;

  if (!responseObj) {
    throw new RefinerError(
      'Invalid response structure from webhook',
      RefineErrorCode.INVALID_RESPONSE
    );
  }

  // Try known fields first
  const typedResponse = responseObj as WebhookResponse;
  let raw =
    typedResponse.output ?? typedResponse.refined ?? typedResponse.text ?? typedResponse.content;

  // Fallback to finding first non-empty string
  if (!raw) {
    raw = findFirstNonEmptyString(responseObj) ?? undefined;
  }

  if (!raw) {
    throw new RefinerError('No usable output field in response', RefineErrorCode.INVALID_RESPONSE);
  }

  const refined = normalizeOutput(raw);

  if (!refined || refined.trim() === '') {
    throw new RefinerError('Refined prompt is empty', RefineErrorCode.EMPTY_RESPONSE);
  }

  return refined;
}

/**
 * Send prompt to webhook and get refined result
 */
export async function sendToWebhook(prompt: string, config: RefinerConfig): Promise<string> {
  const { webhookUrl, timeoutMs, maxRetries, baseDelayMs } = config;
  const startTime = Date.now();

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await httpPost(webhookUrl, { prompt }, { timeoutMs });
      const elapsedMs = Date.now() - startTime;
      console.debug(`[sendToWebhook] Completed in ${elapsedMs}ms`);

      // Handle rate limiting with backoff
      if (isRateLimited(response.status, response.body)) {
        if (attempt === maxRetries) {
          throw new RefinerError(
            `Rate limited: ${response.body || response.status}`,
            RefineErrorCode.RATE_LIMITED
          );
        }
        const delay = calculateBackoffDelay(attempt, baseDelayMs);
        await sleep(delay);
        continue;
      }

      // Handle HTTP errors
      if (response.status < 200 || response.status >= 300) {
        throw new RefinerError(
          `Webhook error: ${response.status} ${response.body}`,
          RefineErrorCode.WEBHOOK_ERROR
        );
      }

      // Extract and return refined prompt
      return extractRefinedPrompt(response.body);
    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      lastError = error;

      // Don't retry abort errors
      if (isAbortError(error)) {
        console.error(
          `[sendToWebhook] Request timed out after ${elapsedMs}ms (timeoutMs=${timeoutMs})`
        );
        throw new RefinerError('Request timed out', RefineErrorCode.TIMEOUT, error as Error);
      }

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        if (error instanceof RefinerError) {
          throw error;
        }
        throw new RefinerError(
          `Network error: ${error instanceof Error ? error.message : String(error)}`,
          RefineErrorCode.NETWORK_ERROR,
          error instanceof Error ? error : undefined
        );
      }

      // Wait before retrying
      const delay = calculateBackoffDelay(attempt, baseDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}
