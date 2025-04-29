import { Browser, Page, chromium as pChromium } from 'playwright'
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright'
import { fetch as crossFetch } from 'cross-fetch'
import chromium from '@sparticuz/chromium'
import { VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from './config'

// Define base URL for the application - should be determined at runtime from request
export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL || ''

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Save-Data': 'on',
  DNT: '1',
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
  } catch {
    // If URL constructor throws, it's relative
    return false
  }
}

// Function to get an absolute URL from a potentially relative URL
export function getAbsoluteUrl(url: string, baseUrl: string): string {
  return isAbsoluteUrl(url) ? url : new URL(url, baseUrl).toString()
}

// Function to get absolute app URL (for proxy endpoints)
export function getAppUrl(path: string, baseUrl?: string): string {
  const base = baseUrl || APP_BASE_URL
  if (!base) {
    throw new Error('Base URL is required but not provided')
  }
  return new URL(path, base).toString()
}

// Function to normalize a URL
export function normalizeUrl(url: string, useHttpCompatibility = true): string {
  // Add http:// if no protocol is specified
  let normalizedUrl = url
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `http://${normalizedUrl}`
  }

  // Optionally replace https with http for compatibility with vintage browsers
  return useHttpCompatibility ? normalizedUrl.replace('https://', 'http://') : normalizedUrl
}

// Response with content info
export interface ContentResponse {
  content: string
  contentType: string
  isHtml: boolean
  originalResponse?: Response
}

// Function to fetch a URL with options
export async function fetchURL(url: string, options: FetchOptions = {}): Promise<ContentResponse> {
  const { method = 'GET', formData = null, headers = {} } = options

  // Merge headers
  const mergedHeaders = {
    ...BROWSER_HEADERS,
    ...headers,
  }

  const isForm = method === 'POST' && formData

  // Perform the fetch
  const response = await fetch(url, {
    method,
    headers: mergedHeaders,
    body: isForm ? formData : undefined,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  // Get content type from response
  const contentType = response.headers.get('content-type') || 'text/html'
  const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml+xml')

  // For HTML content, return as text
  const content = await response.text()
  return { content, contentType, isHtml, originalResponse: response }
}

// PlaywrightPage interface to match the JSDOM interface for compatibility
export interface PlaywrightPage {
  window: {
    document: Document
    getComputedStyle: (element: Element) => Promise<CSSStyleDeclaration>
  }
  serialize: () => Promise<string>
  page: Page
  browser: Browser
  title: string
}

// Adblocker implementation
let blockerInstance: PlaywrightBlocker | null = null
let browserInstance: Browser | null = null

async function initializeBlocker(): Promise<PlaywrightBlocker> {
  if (!blockerInstance) {
    // Initialize with EasyList, Fanboy's Annoyance List, and Fanboy's Social Blocking List
    blockerInstance = await PlaywrightBlocker.fromLists(
      crossFetch,
      [
        // EasyList (main adblock list)
        'https://easylist.to/easylist/easylist.txt',
        // Fanboy's Annoyance List (blocks popups, newsletter signups, etc.)
        'https://easylist.to/easylist/fanboy-annoyance.txt',
        // Fanboy's Social Blocking List (blocks social media widgets)
        'https://easylist.to/easylist/fanboy-social.txt',
      ],
      {
        enableCompression: true,
        enableOptimizations: true,
      }
    )
  }
  return blockerInstance
}

// Get a browser instance with a singleton pattern
async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    // Use special non-UI chrome on vercel
    if (process.env.NODE_ENV === 'production') {
      browserInstance = await pChromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    } else {
      browserInstance = await pChromium.launch({
        headless: true,
      })
    }
  }
  return browserInstance
}

export async function loadPage(html: string, baseUrl?: string): Promise<PlaywrightPage> {
  const browser = await getBrowser()
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; CrashNet/1.0; +http://crashnet.example)',
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 1, // Low DPI to prefer low resolution images
    ignoreHTTPSErrors: true,
    // Use a mobile device profile to prefer mobile/smaller images
    isMobile: true,
    hasTouch: true,
  })

  const page = await context.newPage()

  // Enable ad blocking
  const blocker = await initializeBlocker()
  await blocker.enableBlockingInPage(page)

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
      getComputedStyle: async (element: Element) => {
        return page.evaluate((el) => getComputedStyle(el), element as any)
      },
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
