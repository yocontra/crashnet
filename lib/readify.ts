import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { getCrashnetHeader } from './header'
import { processImagesForProxy, processLinksForProxy } from './dom'

export interface ReadableResult {
  title: string
  content: string
  byline?: string
  excerpt?: string
}

export async function readify(dom: JSDOM, url: string): Promise<JSDOM> {
  // Clone the DOM to avoid modifying the original
  const clonedDom = new JSDOM(dom.serialize())

  // Use Mozilla's Readability to extract the article content
  const reader = new Readability(clonedDom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Could not parse article content')
  }

  // Get the article content
  const { title, content } = article

  // Add our header and make the dom
  const articleDom = new JSDOM(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || dom.window.document.title || url}</title>
      </head>
      <body>
        <div>
          ${getCrashnetHeader(url, true)}
        </div>
        ${content}
      </body>
    </html>
  `
  )

  // Process URLs for images and links
  processImagesForProxy(articleDom, url)
  processLinksForProxy(articleDom, url, true) // Pass true for isReadMode

  return articleDom
}
