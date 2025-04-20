export default async function ProxyPage() {
  return (
    <html>
      <head>
        <title>Redirecting...</title>
        <meta httpEquiv="refresh" content="0;url=/proxy" />
      </head>
      <body bgcolor="white" text="black">
        <center>
          <p>Redirecting to /proxy route handler...</p>
        </center>
      </body>
    </html>
  )
}
