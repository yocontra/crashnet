import { NextResponse } from 'next/server'
import { TARGET_WIDTH } from '@/lib/config'
import { minify } from '@/lib/dom/minify'

export const dynamic = 'force-dynamic'

export async function GET() {
  const homepage = `<!DOCTYPE html>
  <html>
    <head>
      <title>CrashNet - Browse</title>
    </head>
    <body bgcolor="white" text="black">
      <center>
        <h1><font face="Courier">CrashNet</font></h1>
        <p>Web Proxy for Vintage Computers</p>
        <br />
        <form action="/proxy" method="get">
          <input type="text" name="url" size="40" />
          <input type="submit" value="Go" />
        </form>
        <br />
        <hr width="${TARGET_WIDTH / 2}" />
        <br />
        <p>
          CrashNet strips modern web elements to make sites accessible on vintage computers.
          <br />
          No SSL, CSS, JavaScript - just pure HTML content.
        </p>
      </center>
    </body>
  </html>`

  return new NextResponse(await minify(homepage), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
