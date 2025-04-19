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
          <br/>
          <form action="/proxy" method="get">
            <input type="text" name="url" size="40" />
            <input type="submit" value="Go" />
          </form>
          <br/>
          <hr width="50%" />
          <br/>
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
