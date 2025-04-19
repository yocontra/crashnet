import { fetchAndSimplify } from "@/lib/fetchAndSimplify"

// Disable all automatic optimizations
export const dynamic = "force-static"
export const revalidate = false
export const fetchCache = "force-no-store"
export const runtime = "nodejs"
export const preferredRegion = "auto"

// Disable metadata
export const generateMetadata = () => {
  return { title: "Crashnet Proxy" }
}

interface ProxyPageProps {
  searchParams: {
    url?: string
  }
}

export default async function ProxyPage({ searchParams }: ProxyPageProps) {
  const { url } = searchParams

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
    // Normalize URL (add http:// if missing)
    let normalizedUrl = url
    // Add http:// if no protocol is specified
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `http://${normalizedUrl}`
    }
    // Replace https:// with http:// for vintage browser compatibility
    normalizedUrl = normalizedUrl.replace("https://", "http://")

    // Fetch and simplify the content
    const { title, content } = await fetchAndSimplify(normalizedUrl)

    // Extract the body content from the simplified HTML
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    const bodyContent = bodyMatch ? bodyMatch[1] : content

    // Return JSX instead of a Response object
    return (
      <html>
        <head>
          <title>{`${title} - Crashnet`}</title>
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
    return (
      <html>
        <head>
          <title>Crashnet - Error</title>
        </head>
        <body bgcolor="white" text="black">
          <center>
            <h1>Error Fetching URL</h1>
            <p>{error instanceof Error ? error.message : "Unknown error"}</p>
            <p>
              <a href="/">Return to Homepage</a>
            </p>
          </center>
        </body>
      </html>
    )
  }
}
