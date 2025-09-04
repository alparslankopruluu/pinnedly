export interface UrlMetadata {
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    // Validate URL first
    const urlObj = new URL(url);
    const metadata: UrlMetadata = {
      domain: urlObj.hostname
    };
    
    // Try to fetch metadata using a CORS proxy or fallback to basic info
    try {
      // Use a more reliable CORS proxy with timeout
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; MetadataBot/1.0)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      if (html) {
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        
        // Extract OG title (preferred)
        const ogTitleMatch = html.match(/<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
        if (ogTitleMatch) {
          metadata.title = ogTitleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        
        // Extract description
        const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
        if (descMatch) {
          metadata.description = descMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        
        // Extract OG description (preferred)
        const ogDescMatch = html.match(/<meta[^>]*property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
        if (ogDescMatch) {
          metadata.description = ogDescMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        
        // Extract OG image
        const ogImageMatch = html.match(/<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
        if (ogImageMatch) {
          let imageUrl = ogImageMatch[1].trim();
          // Handle relative URLs
          if (imageUrl.startsWith('/')) {
            imageUrl = `${urlObj.protocol}//${urlObj.hostname}${imageUrl}`;
          } else if (imageUrl.startsWith('./')) {
            imageUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}/${imageUrl.substring(2)}`;
          }
          metadata.image = imageUrl;
        }
      }
    } catch (proxyError) {
      console.log('Metadata fetch failed, using URL-based fallback:', proxyError);
      // Fallback: extract basic info from URL
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        metadata.title = pathParts[pathParts.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\.[^.]*$/, '') // remove file extension
          .replace(/\b\w/g, l => l.toUpperCase()); // capitalize words
      } else {
        metadata.title = urlObj.hostname.replace(/^www\./, '');
      }
      
      // Don't throw here, just return the fallback metadata
    }
    
    return metadata;
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    // Return basic fallback metadata
    try {
      const urlObj = new URL(url);
      return {
        domain: urlObj.hostname,
        title: urlObj.hostname.replace(/^www\./, ''),
      };
    } catch {
      return {};
    }
  }
}

export function getSourceFromUrl(url: string): 'twitter' | 'instagram' | 'medium' | 'linkedin' | 'other' {
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('medium.com')) return 'medium';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'other';
}