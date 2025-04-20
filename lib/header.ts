// Shared header component for Crashnet pages

/**
 * Generates the Crashnet header HTML with navigation
 * @param url The target URL being proxied (original URL, not the proxy URL)
 * @param isReading Whether the current view is in reading mode
 * @returns HTML string for the header
 */
export function getCrashnetHeader(url: string, isReading: boolean): string {
  const uri = encodeURIComponent(url)
  const readingText = isReading ? 'Web Mode' : 'Reading Mode'
  return `
    <center>
      <font face="Chicago" size="3">
        <form action="/proxy" method="get" width="100%">
          <a href="/">Back to <b>CrashNet</b></a>&nbsp;&nbsp;&nbsp;
          <input type="text" name="url" value="${url}" size="30">
          <input type="submit" value="Go">&nbsp;&nbsp;&nbsp;
          <a href="/proxy?${isReading ? `url=${uri}` : `read=true&url=${uri}`}">${readingText}</a>
        </form>
      </font>
      <hr>
    </center>
  `
}
