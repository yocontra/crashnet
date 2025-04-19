import { JSDOM } from 'jsdom'

// Common headers for fetching content
const VINTAGE_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/4.0 (compatible; MSIE 5.0; Mac_PowerPC)',
  Accept: 'text/html,text/plain',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'identity',
  'X-Requested-With': 'XMLHttpRequest',
  'Save-Data': 'on',
  DNT: '1',
}

const MODERN_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Crashnet/1.0; +http://crashnet.example)',
  Accept: 'text/html,application/xhtml+xml,application/xml',
  'Accept-Language': 'en-US,en;q=0.9',
}

// Options for fetch functions
export interface FetchOptions {
  method?: string
  formData?: FormData | null
  headers?: Record<string, string>
}

// Function to check if a URL is absolute
export function isAbsoluteUrl(url: string): boolean {
  return !!url.match(/^[a-zA-Z]+:\/\//)
}

// Function to get an absolute URL from a potentially relative URL
export function getAbsoluteUrl(url: string, baseUrl: string): string {
  return isAbsoluteUrl(url) ? url : new URL(url, baseUrl).toString()
}

// Function to normalize a URL
export function normalizeUrl(url: string, useHttpCompatibility = true): string {
  // Add http:// if no protocol is specified
  let normalizedUrl = url
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `http://${normalizedUrl}`
  }

  // Optionally replace https with http for compatibility with vintage browsers
  if (useHttpCompatibility) {
    normalizedUrl = normalizedUrl.replace('https://', 'http://')
  }

  return normalizedUrl
}

// Function to fetch a URL with options
export async function fetchURL(
  url: string,
  options: FetchOptions = {},
  useVintageHeaders = true
): Promise<string> {
  const { method = 'GET', formData = null, headers = {} } = options

  // Choose header set based on mode
  const baseHeaders = useVintageHeaders ? VINTAGE_BROWSER_HEADERS : MODERN_BROWSER_HEADERS

  // Merge headers
  const mergedHeaders = {
    ...baseHeaders,
    ...headers,
  }

  // Perform the fetch
  const response = await fetch(url, {
    method,
    headers: mergedHeaders,
    body: method === 'POST' && formData ? formData : undefined,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

export function parseHTML(html: string, baseUrl?: string): JSDOM {
  // If baseUrl is provided, use it to ensure proper URL resolution
  const options = baseUrl ? { url: baseUrl } : {}
  return new JSDOM(html, options)
}
