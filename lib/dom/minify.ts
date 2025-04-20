import { minify as minifyBase } from 'html-minifier-terser'

const HTML_MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: false,
  minifyJS: false,
  removeEmptyAttributes: true,
  removeOptionalTags: true,
  removeAttributeQuotes: true,
  removeEmptyElements: true,
  keepClosingSlash: false,
  caseSensitive: false,
}

export const minify = (html: string): Promise<string> => minifyBase(html, HTML_MINIFY_OPTIONS)
