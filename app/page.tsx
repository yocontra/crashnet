export default function HomePage() {
  return (
    <html>
      <head>
        <title>Crashnet - Browse</title>
      </head>
      <body bgcolor="white" text="black">
        <center>
          <h1>CRASHNET</h1>
          <p>Web Proxy for Vintage Computers</p>

          <form action="/proxy" method="get">
            <p>Enter URL to browse:</p>
            <input type="text" name="url" size="40" />
            <input type="submit" value="Go" />
          </form>

          <hr width="75%" />

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
