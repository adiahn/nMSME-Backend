const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Convert a Cloudinary image/upload URL to raw/upload URL for documents
 * @param {string} url - The original Cloudinary URL
 * @param {string} originalName - The original file name
 * @param {string} mimeType - The MIME type of the file
 * @returns {Object} - Object with corrected URLs
 */
function convertToCorrectResourceType(url, originalName, mimeType) {
  if (!url) {
    return {
      primary: null,
      fallback: null,
      resource_type: 'unknown'
    };
  }
  
  // Ensure we have valid strings
  const safeOriginalName = (originalName || '').toLowerCase();
  const safeMimeType = (mimeType || '').toLowerCase();
  
  // Determine if this should be a raw document
  const isDocument = ['pdf', 'doc', 'docx'].some(ext => 
    safeOriginalName.endsWith(`.${ext}`) ||
    safeMimeType.includes('pdf') ||
    safeMimeType.includes('document')
  );
  
  if (isDocument) {
    // For documents, try both resource types
    let primaryUrl = url;
    let fallbackUrl = url;
    
    if (url.includes('/image/upload/')) {
      // Try raw/upload first, keep image/upload as fallback
      primaryUrl = url.replace('/image/upload/', '/raw/upload/');
      fallbackUrl = url;
    } else if (url.includes('/raw/upload/')) {
      // Already raw, keep image/upload as fallback
      fallbackUrl = url.replace('/raw/upload/', '/image/upload/');
    }
    
    return {
      primary: primaryUrl,
      fallback: fallbackUrl,
      resource_type: 'raw'
    };
  } else {
    // For images, keep as is
    return {
      primary: url,
      fallback: null,
      resource_type: 'image'
    };
  }
}

/**
 * Generate a signed URL for private documents
 * @param {string} cloudinaryId - The Cloudinary public ID
 * @param {string} resourceType - The resource type (image, raw, video)
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {string} - The signed URL
 */
function generateSignedUrl(cloudinaryId, resourceType = 'raw', expiresIn = 3600) {
  return cloudinary.utils.download_url(cloudinaryId, {
    resource_type: resourceType,
    type: 'upload',
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn
  });
}

/**
 * Generate a working URL for documents using signed URLs
 * @param {string} url - The original Cloudinary URL
 * @param {string} originalName - The original file name
 * @param {string} mimeType - The MIME type of the file
 * @param {string} cloudinaryId - The Cloudinary public ID
 * @returns {Object} - Object with working URLs
 */
function generateWorkingUrl(url, originalName, mimeType, cloudinaryId) {
  if (!url) {
    return {
      primary: null,
      fallback: null,
      resource_type: 'unknown'
    };
  }
  
  // Ensure we have valid strings
  const safeOriginalName = (originalName || '').toLowerCase();
  const safeMimeType = (mimeType || '').toLowerCase();
  
  // Determine if this should be a document
  const isDocument = ['pdf', 'doc', 'docx'].some(ext => 
    safeOriginalName.endsWith(`.${ext}`) ||
    safeMimeType.includes('pdf') ||
    safeMimeType.includes('document')
  );
  
  if (isDocument) {
    // For documents, since Cloudinary PDF delivery is now enabled,
    // use the original URL directly
    return {
      primary: url, // Use original Cloudinary URL directly
      fallback: url, // Same as primary
      resource_type: 'document',
      is_signed: false,
      is_proxy: false
    };
  } else {
    // For images, keep as is
    return {
      primary: url,
      fallback: null,
      resource_type: 'image',
      is_signed: false
    };
  }
}

/**
 * Check if a Cloudinary URL is accessible
 * @param {string} url - The Cloudinary URL to check
 * @returns {Promise<boolean>} - True if accessible, false otherwise
 */
async function checkUrlAccessibility(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Fix document URLs in an application
 * @param {Object} application - The application object
 * @returns {Object} - The application with fixed document URLs
 */
function fixApplicationDocumentUrls(application) {
  if (!application.documents || !Array.isArray(application.documents)) {
    return application;
  }
  
  const fixedDocuments = application.documents.map(doc => {
    // Use the existing URL and generate working URLs
    const originalName = doc.original_name || doc.filename || 'unknown';
    const mimeType = doc.mime_type || 'application/octet-stream';
    const cloudinaryId = doc.cloudinary_id || doc.filename;
    
    const urlInfo = generateWorkingUrl(doc.url, originalName, mimeType, cloudinaryId);
    
    // Use the primary URL directly (now that Cloudinary PDF delivery is enabled)
    let finalUrl = urlInfo.primary;
    
    return {
      ...doc,
      url: finalUrl,
      fallback_url: urlInfo.fallback,
      resource_type: urlInfo.resource_type,
      is_signed: urlInfo.is_signed,
      is_proxy: urlInfo.is_proxy,
      is_accessible: true // Assume accessible, can be verified separately
    };
  });
  
  return {
    ...application,
    documents: fixedDocuments
  };
}

module.exports = {
  convertToCorrectResourceType,
  generateWorkingUrl,
  generateSignedUrl,
  checkUrlAccessibility,
  fixApplicationDocumentUrls
};
