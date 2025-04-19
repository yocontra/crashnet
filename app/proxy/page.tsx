import { fetchAndSimplify } from "@/lib/proxy-utils"

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
    const simplifiedContent = await fetchAndSimplify(normalizedUrl)

    // Return the simplified content as HTML
    return (
      <html
        dangerouslySetInnerHTML={{
          __html: simplifiedContent.replace(/<!DOCTYPE html>|<html>|<\/html>/gi, ""),
        }}
      />
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
