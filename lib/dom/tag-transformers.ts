import { PlaywrightPage } from '../fetch'
import { REMOVE_SELECTORS, MODERN_ATTRIBUTES } from './constants'

// Replace modern tags with vintage equivalents
export async function replaceModernTags(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    // Convert <strong> tags to <b> tags
    const strongTags = document.querySelectorAll('strong')
    for (const strongTag of strongTags) {
      const b = document.createElement('b')
      while (strongTag.firstChild) {
        b.appendChild(strongTag.firstChild)
      }
      strongTag.parentNode?.replaceChild(b, strongTag)
    }

    // Convert <em> tags to <i> tags
    const emTags = document.querySelectorAll('em')
    for (const emTag of emTags) {
      const i = document.createElement('i')
      while (emTag.firstChild) {
        i.appendChild(emTag.firstChild)
      }
      emTag.parentNode?.replaceChild(i, emTag)
    }

    // Convert form buttons to input type=submit
    const formButtons = document.querySelectorAll('form button')
    for (const button of formButtons) {
      const buttonText = button.textContent || 'Submit'
      const input = document.createElement('input')
      input.setAttribute('type', 'submit')
      input.setAttribute('value', buttonText.trim())

      // Copy any name attribute
      if (button.hasAttribute('name')) {
        input.setAttribute('name', button.getAttribute('name') || '')
      }

      // Check if button is disabled
      if (button.hasAttribute('disabled')) {
        input.setAttribute('disabled', '')
      }

      button.parentNode?.replaceChild(input, button)
    }
  })
}

// Remove unwanted elements from the document
export async function removeUnwantedElements(pw: PlaywrightPage): Promise<void> {
  const selectors = REMOVE_SELECTORS
  await pw.page.evaluate(
    (params) => {
      const { selectors } = params

      // Create a combined selector by joining all selectors with commas
      const combinedSelector = selectors.join(', ')

      // Find all elements matching any of the selectors
      const elementsToRemove = document.querySelectorAll(combinedSelector)

      // Remove each element
      elementsToRemove.forEach((element) => element.remove())
    },
    { selectors }
  )
}

// Remove hidden elements based on computed style
export async function removeHiddenElements(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    const elements = document.querySelectorAll('*')

    for (const element of elements) {
      const computedStyle = getComputedStyle(element)
      if (computedStyle?.display === 'none' || computedStyle?.visibility === 'hidden') {
        element.remove()
      }
    }
  })
}

// Remove modern attributes from all elements
export async function removeModernAttributesFromAll(pw: PlaywrightPage): Promise<void> {
  const modernAttributes = MODERN_ATTRIBUTES
  await pw.page.evaluate(
    (params) => {
      const { modernAttributes } = params
      const allElements = document.querySelectorAll('*')

      for (const element of allElements) {
        // Get all attributes
        const attributes = Array.from(element.attributes)

        // Check each attribute against the list of modern attributes
        for (const attr of attributes) {
          const name = attr.name.toLowerCase()

          // Check if the attribute name starts with any of the modern attribute prefixes
          if (modernAttributes.some((prefix) => name.startsWith(prefix))) {
            element.removeAttribute(attr.name)
          }
        }
      }
    },
    { modernAttributes }
  )
}

// Set basic styling attributes on the body
export async function setBodyAttributes(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    // Check if document.body exists
    if (document && document.body) {
      document.body.setAttribute('bgcolor', 'white')
      document.body.setAttribute('text', 'black')
      document.body.setAttribute('link', 'blue')
      document.body.setAttribute('vlink', 'purple')
    } else {
      // If no body exists yet, create one
      try {
        if (!document.body && document.documentElement) {
          const body = document.createElement('body')
          body.setAttribute('bgcolor', 'white')
          body.setAttribute('text', 'black')
          body.setAttribute('link', 'blue')
          body.setAttribute('vlink', 'purple')
          document.documentElement.appendChild(body)
        }
      } catch (error) {
        console.error('Failed to create body element:', error)
      }
    }
  })
}
