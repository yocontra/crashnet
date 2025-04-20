import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if the requested path actually exists
  // For this application, we only want to handle: / (root), /proxy, /image_proxy,
  // and valid static files.

  const url = request.nextUrl.pathname

  // Skip existing routes
  if (
    url === '/' ||
    url.startsWith('/proxy') ||
    url.startsWith('/image_proxy') ||
    url.startsWith('/_next') ||
    url === '/favicon.ico'
  ) {
    // Allow the request to proceed normally
    return NextResponse.next()
  }

  // If we reach here, we should return a 404
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>CrashNet - Not Found</title>
      </head>
      <body bgcolor="white" text="black">
        <center>
          <h1>Page Not Found</h1>
          <p>The page you requested could not be found.</p>
          <p>
            <a href="/">Return to Homepage</a>
          </p>
        </center>
      </body>
    </html>`,
    {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}

// Run middleware on all paths
export const config = {
  matcher: '/:path*',
}
