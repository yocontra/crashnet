// Re-export all DOM manipulation functions and constants

// Constants
export { APP_BASE_URL, MODERN_ATTRIBUTES, REMOVE_SELECTORS } from './constants'

// Utilities
export { rgbToHexOrName, convertFontSizeToLegacy } from './utils'

// Image handling
export {
  handleImages,
  selectSourceFromSrcset,
  handleSVGs,
  processPictureElements,
} from './image-processing'

// Link processing
export { processLinksForProxy } from './link-processing'

// Media handling
export { handleVideoTags, handleAudioTags } from './media-handlers'

// Tag transformations
export {
  replaceModernTags,
  removeUnwantedElements,
  removeHiddenElements,
  removeModernAttributesFromAll,
  setBodyAttributes,
} from './tag-transformers'

// Style processors
export { preserveComputed } from './style-processors'

// Header functionality
export { addCrashNetHeader } from './header'
