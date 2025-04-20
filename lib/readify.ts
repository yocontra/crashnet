import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { getCrashnetHeader } from './header'
import { handleImages, processLinksForProxy, handleSVGs } from './dom'

export interface ReadableResult {
  title: string
  content: string
  byline?: string
  excerpt?: string
}

export async function readify(dom: JSDOM, url: string): Promise<JSDOM> {
  // Save the original title before manipulation
  const originalTitle = dom.window.document.title

  // Clone the DOM to avoid modifying the original
  const clonedDom = new JSDOM(dom.serialize())

  // Also preserve the title in the cloned DOM
  if (originalTitle) {
    clonedDom.window.document.title = originalTitle
  }

  // Use Mozilla's Readability to extract the article content
  const reader = new Readability(clonedDom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Could not parse article content')
  }

  // Get the article content - prefer article title from Readability, but fall back to original title if needed
  const { title = originalTitle, content } = article

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
  handleImages(articleDom, url, true)
  handleSVGs(clonedDom)
  processLinksForProxy(articleDom, url, true)

  return articleDom
}
