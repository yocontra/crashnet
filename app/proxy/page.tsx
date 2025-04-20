import { fetchURL, normalizeUrl, parseHTML } from '@/lib/fetch'
import { simplify } from '@/lib/simplify'
import { readify } from '@/lib/readify'
import { minify } from 'html-minifier-terser'

export const dynamic = 'force-dynamic'

const HTML_MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: false,
  removeEmptyAttributes: true,
  removeOptionalTags: true,
  removeAttributeQuotes: true,
  removeEmptyElements: false,
  keepClosingSlash: false,
  caseSensitive: false,
}

interface ProxyPageProps {
  searchParams: {
    url?: string
    read?: string
  }
}

export default async function ProxyPage(props: ProxyPageProps) {
  // Await search params to resolve
  const searchParams = await Promise.resolve(props.searchParams)

  // Now safely access the properties
  const url = searchParams?.url
  const read = searchParams?.read
  const isReadMode = read === 'true'

  // Error page if no URL provided
  if (!url) {
    return (
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
      </html>
    )
  }

  try {
    // Normalize URL (don't force HTTP in reader mode)
    const normalizedUrl = normalizeUrl(url, !isReadMode)

    // Fetch the content with appropriate headers based on mode
    const htmlContent = await fetchURL(normalizedUrl, {}, !isReadMode)

    // Parse the HTML into a DOM
    const dom = parseHTML(htmlContent, normalizedUrl)

    // Process content based on mode
    let processedDom
    if (isReadMode) {
      processedDom = await readify(dom, normalizedUrl)
    } else {
      processedDom = await simplify(dom, normalizedUrl)
    }

    // Minify the HTML
    const html = await minify(processedDom.serialize(), HTML_MINIFY_OPTIONS)

    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : html

    // Return the processed page
    return (
      <html>
        <head>
          <title>{processedDom.window.document.title || url}</title>
        </head>
        <body
          bgcolor="white"
          text="black"
          link="blue"
          vlink="purple"
          dangerouslySetInnerHTML={{ __html: bodyContent }}
        />
      </html>
    )
  } catch (error) {
    // Error handling
    return (
      <html>
        <head>
          <title>Crashnet - Error</title>
        </head>
        <body bgcolor="white" text="black">
          <center>
            <h1>Error Fetching URL</h1>
            <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
            <p>
              <a href="/">Return to Homepage</a>
            </p>
          </center>
        </body>
      </html>
    )
  }
}
