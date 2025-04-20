import { chromium, Browser, Page } from 'playwright'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './config'

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

// PlaywrightPage interface to match the JSDOM interface for compatibility
export interface PlaywrightPage {
  window: {
    document: Document
    getComputedStyle: (element: Element) => CSSStyleDeclaration
    XMLSerializer: new () => XMLSerializer
  }
  serialize: () => string
  page: Page
  browser: Browser
  title: string
}

// Get a browser instance with a singleton pattern
let browserInstance: Browser | null = null
async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
    })
  }
  return browserInstance
}

export async function loadPage(html: string, baseUrl?: string): Promise<PlaywrightPage> {
  const browser = await getBrowser()
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; Crashnet/1.0; +http://crashnet.example)',
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 1, // Low DPI to prefer low resolution images
    ignoreHTTPSErrors: true,
    // Use a mobile device profile to prefer mobile/smaller images
    isMobile: true,
    hasTouch: true,
  })

  const page = await context.newPage()

  // If we have direct HTML content and a baseUrl, we'll navigate to the baseUrl
  // and then set the content to ensure resources load correctly
  if (baseUrl) {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    if (html && html.trim().length > 0) {
      await page.setContent(html, { waitUntil: 'networkidle' })
    }
  } else {
    // If we just have HTML content, set it directly
    await page.setContent(html, { waitUntil: 'networkidle' })
  }

  // Create a PlaywrightPage object that has similar capabilities to JSDOM
  const title = await page.title()

  // Access to the document through evaluate
  const pwPage: PlaywrightPage = {
    window: {
      document: await page.evaluate(() => document),
      getComputedStyle: (element: Element) => {
        return page.evaluate(
          (el) => getComputedStyle(el),
          element
        ) as unknown as CSSStyleDeclaration
      },
      // We don't need to provide XMLSerializer as we're using it in browser context
      XMLSerializer: {} as any,
    },
    serialize: () => {
      // Return a promise that resolves to the page content
      return page.content()
    },
    page, // Expose the actual playwright page
    browser, // Expose the browser instance
    title,
  }

  return pwPage
}
