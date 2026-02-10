/**
 * Calculates estimated reading time in minutes based on word count.
 */
export const calculateReadTime = (content: string): number => {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return minutes || 1 // Minimum 1 minute
}

/**
 * Extracts plain text from HTML by removing all tags.
 */
export const extractPlainText = (html: string): string => {
  return html.replace(/<[^>]*>/g, '')
}
