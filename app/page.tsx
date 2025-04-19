// Disable all automatic optimizations
export const dynamic = "force-static"
export const revalidate = false
export const fetchCache = "force-no-store"
export const runtime = "nodejs"
export const preferredRegion = "auto"

// Disable metadata
export const generateMetadata = () => {
  return { title: "Crashnet" }
}

export default function HomePage() {
  // Return JSX instead of a Response object
  return (
    <html>
      <head>
        <title>Crashnet - Browse</title>
      </head>
      <body bgcolor="white" text="black">
        <center>
          <h1>CRASHNET</h1>
          <p>Web Proxy for Vintage Computers</p>
          <br />
          <form action="/proxy" method="get">
            <input type="text" name="url" size="40" />
            <input type="submit" value="Go" />
          </form>
          <br />
          <hr width="50%" />
          <br />
          <p>
            Crashnet strips modern web elements to make sites accessible on vintage computers.
            <br />
            No SSL, CSS, JavaScript - just pure HTML content.
          </p>
        </center>
      </body>
    </html>
  )
}
