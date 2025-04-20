import { DOMWindow } from 'jsdom'
import { JSDOM } from 'jsdom'

// Define base URL for the application
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000'

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

// Function to check if a URL is absolute using URL API
export function isAbsoluteUrl(url: string): boolean {
  try {
    // Use URL constructor - it will throw if the URL is not absolute without a base
    new URL(url)

    // Check if it has a protocol
    return url.includes('://')
  } catch (error) {
    // If URL constructor throws, it's relative
    return false
  }
}

// Function to get an absolute URL from a potentially relative URL
export function getAbsoluteUrl(url: string, baseUrl: string): string {
  return isAbsoluteUrl(url) ? url : new URL(url, baseUrl).toString()
}

// Function to get absolute app URL (for proxy endpoints)
export function getAppUrl(path: string): string {
  return new URL(path, APP_BASE_URL).toString()
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

// Function to wait for window load event
function waitForWindowLoad(window: DOMWindow): Promise<void> {
  return new Promise((resolve) => {
    if (window.document.readyState === 'complete') {
      // If already loaded, resolve after a small timeout
      setTimeout(resolve, 100)
      return
    }

    window.addEventListener('load', () => {
      // Give it a bit more time just in case
      setTimeout(resolve, 100)
    })
  })
}

export async function loadPage(html: string, baseUrl?: string): Promise<JSDOM> {
  const dom = new JSDOM(html, {
    url: baseUrl,
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously',
    referrer: baseUrl,
    contentType: 'text/html',
    includeNodeLocations: true,
    storageQuota: 10000000,
  })

  await waitForWindowLoad(dom.window)

  return dom
}
