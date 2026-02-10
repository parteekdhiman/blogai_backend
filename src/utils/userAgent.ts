/**
 * Simple User Agent Parser
 * In a real-world app, you might use a library like 'ua-parser-js'
 */
export const parseUserAgent = (ua: string | null): string => {
  if (!ua) return 'Unknown Device'
  
  const lowerUa = ua.toLowerCase()
  
  if (lowerUa.includes('iphone')) return 'iPhone'
  if (lowerUa.includes('ipad')) return 'iPad'
  if (lowerUa.includes('android')) return 'Android Device'
  if (lowerUa.includes('windows')) return 'Windows PC'
  if (lowerUa.includes('macintosh')) return 'Mac'
  if (lowerUa.includes('linux')) return 'Linux PC'
  
  return 'Desktop/Mobile'
}
