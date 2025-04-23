import { NextRequest, NextResponse } from 'next/server'
import { fetchURL, normalizeUrl, loadPage } from '@/lib/fetch'
import { simplify } from '@/lib/simplify'
import { readify } from '@/lib/readify'
import { minify } from '@/lib/dom/minify'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return handleProxyRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, 'POST')
}

async function handleProxyRequest(request: NextRequest, method: 'GET' | 'POST') {
  const requestUrl = request.nextUrl
  const url = requestUrl.searchParams.get('url')
  const read = requestUrl.searchParams.get('read')
  const isReadMode = read === 'true'

  if (!url) {
    return new NextResponse(
      await minify(`<!DOCTYPE html>
      <html>
        <head>
          <title>CrashNet - Error</title>
        </head>
        <body bgcolor="white" text="black">
          <center>
            <h1>Error: Missing URL</h1>
            <p>Please provide a URL to proxy.</p>
            <p>
              <a href="/">Return to Homepage</a>
            </p>
          </center>
        </body>
      </html>`),
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    )
  }

  // Get base URL from request (if host header was sent, most old browsers do not)
  const host = request.headers.get('host')
  const baseUrl = host ? `http://${host}` : ''

  let normalizedUrl = normalizeUrl(url, !isReadMode)

  // Handle extra query parameters and append them to the target URL if needed
  if (method === 'GET') {
    try {
      const targetUrlObj = new URL(normalizedUrl)
      const targetParams = targetUrlObj.searchParams
      const originalParams = requestUrl.searchParams

      // Copy all params except 'url' and 'read' to the target URL
      for (const [key, value] of originalParams.entries()) {
        if (key !== 'url' && key !== 'read') {
          targetParams.append(key, value)
        }
      }

      normalizedUrl = targetUrlObj.toString()
    } catch (error) {
      console.error('Error processing URL and query parameters:', error)
    }
  }

  try {
    // Prepare fetchOptions
    const fetchOptions: { method: string; formData?: FormData | null } = {
      method: method,
    }

    // If this is a POST request, extract form data
    if (method === 'POST') {
      try {
        // Parse the form data from the request
        const formData = await request.formData()
        fetchOptions.formData = formData
      } catch (error) {
        console.error('Error parsing form data:', error)
      }
    }

    // Fetch the content with appropriate headers based on mode
    const htmlContent = await fetchURL(normalizedUrl, fetchOptions)

    // Parse the HTML into a DOM
    const dom = await loadPage(htmlContent, normalizedUrl)

    // Process content based on mode
    let processedDom
    if (isReadMode) {
      processedDom = await readify(dom, normalizedUrl, baseUrl)
    } else {
      processedDom = await simplify(dom, normalizedUrl, baseUrl)
    }

    // Minify the HTML
    const html = await processedDom.serialize()

    // Extract body content using proper DOM parsing
    let bodyContent = html
    try {
      // Parse the HTML using a proper parser
      const tempDom = await loadPage(html)
      const bodyElement = tempDom.window.document.body

      // Use the body's innerHTML if it exists
      if (bodyElement) {
        bodyContent = bodyElement.innerHTML
      }
    } catch (error) {
      console.error('Error extracting body content:', error)
      // Fallback to the whole HTML if parsing fails
    }

    // Extract title directly from the processed page
    let pageTitle = ''
    try {
      // Get title properly from the browser
      pageTitle = await processedDom.page.title()
      if (!pageTitle || pageTitle.trim() === '') {
        pageTitle = processedDom.title || url
      }
    } catch (error) {
      console.error('Error getting page title:', error)
      pageTitle = url
    }

    // Create a full HTML document
    const fullHtml = `<!DOCTYPE html>
    <html>
      <head>
        <title>${pageTitle}</title>
      </head>
      <body bgcolor="white" text="black" link="blue" vlink="purple">
        ${bodyContent}
      </body>
    </html>`

    // Return the processed page
    return new NextResponse(await minify(fullHtml), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    // Error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(error)
    return new NextResponse(
      await minify(`<!DOCTYPE html>
      <html>
        <head>
          <title>CrashNet - Error</title>
        </head>
        <body bgcolor="white" text="black">
          <center>
            <h1>Error Fetching URL</h1>
            <p>${errorMessage}</p>
            <p>
              <a href="/">Return to Homepage</a>
            </p>
          </center>
        </body>
      </html>`),
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
        status: 500,
      }
    )
  }
}
