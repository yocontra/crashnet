import { NextRequest, NextResponse } from 'next/server'
import { fetchURL, normalizeUrl, loadPage } from '@/lib/fetch'
import { simplify } from '@/lib/simplify'
import { readify } from '@/lib/readify'
import { minify } from '@/lib/dom/minify'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const read = request.nextUrl.searchParams.get('read')
  const isReadMode = read === 'true'

  // Get base URL from request
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host')
  const baseUrl = `${protocol}://${host}`

  if (!url) {
    return new NextResponse(
      await minify(`<!DOCTYPE html>
      <html>
        <head>
          <title>Crashnet - Error</title>
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

  try {
    // Normalize URL (don't force HTTP in reader mode)
    const normalizedUrl = normalizeUrl(url, !isReadMode)

    // Fetch the content with appropriate headers based on mode
    const htmlContent = await fetchURL(normalizedUrl, {}, !isReadMode)

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
          <title>Crashnet - Error</title>
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
