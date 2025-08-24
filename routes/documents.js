const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const Application = require('../models/Application');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nmsme-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'), false);
    }
  }
});



// @desc    Upload documents (CAC, photos, etc.)
// @route   POST /api/documents/upload/:applicationId
// @access  Private
router.post('/upload/:applicationId', [
  protect,
  upload.array('documents', 5), // Allow up to 5 files
  body('document_type')
    .isIn(['cac_certificate', 'tax_identification', 'product_photos', 'business_plan', 'financial_statements', 'other'])
    .withMessage('Valid document type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { applicationId } = req.params;
    const { document_type } = req.body;

    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to upload documents for this application'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedDocuments = [];

    for (const file of req.files) {
      const document = {
        filename: file.filename,
        original_name: file.originalname,
        url: file.path,
        cloudinary_id: file.filename,
        document_type: document_type,
        size: file.size,
        mime_type: file.mimetype,
        uploaded_at: new Date()
      };

      uploadedDocuments.push(document);
    }

    // Add documents to application
    application.documents.push(...uploadedDocuments);
    await application.save();

    res.status(201).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        uploaded_documents: uploadedDocuments,
        total_documents: application.documents.length
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Document upload failed'
    });
  }
});

// @desc    Upload pitch video via YouTube/Vimeo link
// @route   POST /api/documents/upload-video-link/:applicationId
// @access  Private
router.post('/upload-video-link/:applicationId', [
  protect,
  body('video_url')
    .isURL()
    .withMessage('Please provide a valid video URL'),
  body('video_url')
    .custom((value) => {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+/;
      
      if (!youtubeRegex.test(value) && !vimeoRegex.test(value)) {
        throw new Error('Video URL must be from YouTube or Vimeo');
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { applicationId } = req.params;
    const { video_url } = req.body;

    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to upload video for this application'
      });
    }

    // Check if pitch video already exists
    if (application.pitch_video && application.pitch_video.url) {
      return res.status(400).json({
        success: false,
        error: 'Pitch video already uploaded'
      });
    }

    // Extract video ID and determine platform
    let videoId = '';
    let platform = '';
    
    if (video_url.includes('youtube.com') || video_url.includes('youtu.be')) {
      platform = 'youtube';
      // Extract video ID from YouTube URL
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = video_url.match(youtubeRegex);
      if (match) {
        videoId = match[1];
      }
    } else if (video_url.includes('vimeo.com')) {
      platform = 'vimeo';
      // Extract video ID from Vimeo URL
      const vimeoRegex = /vimeo\.com\/(\d+)/;
      const match = video_url.match(vimeoRegex);
      if (match) {
        videoId = match[1];
      }
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract video ID from URL. Please provide a valid YouTube or Vimeo URL.'
      });
    }

    // Update application with video link
    application.pitch_video = {
      url: video_url,
      is_youtube_link: true,
      youtube_vimeo_url: video_url,
      video_id: videoId,
      platform: platform
    };

    await application.save();

    res.json({
      success: true,
      message: 'Video link uploaded successfully',
      data: {
        pitch_video: application.pitch_video,
        application_id: applicationId
      }
    });

  } catch (error) {
    console.error('Video link upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Error uploading video link'
    });
  }
});

// @desc    Get documents for an application
// @route   GET /api/documents/:applicationId
// @access  Private
router.get('/:applicationId', protect, async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application or is admin/judge
    if (application.user_id.toString() !== req.user.id && 
        !['admin', 'judge'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view these documents'
      });
    }

    res.json({
      success: true,
      data: {
        documents: application.documents,
        pitch_video: application.pitch_video
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching documents'
    });
  }
});



// @desc    Delete individual document
// @route   DELETE /api/documents/:documentId
// @access  Private
router.delete('/:documentId', protect, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Find application that contains this document
    const application = await Application.findOne({
      'documents._id': documentId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this document'
      });
    }

    // Find the document
    const document = application.documents.id(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(document.cloudinary_id);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with local deletion even if Cloudinary fails
    }

    // Remove document from application
    application.documents.pull(documentId);
    await application.save();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting document'
    });
  }
});

// @desc    Delete pitch video
// @route   DELETE /api/documents/video/:applicationId
// @access  Private
router.delete('/video/:applicationId', protect, async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this video'
      });
    }

    if (!application.pitch_video || !application.pitch_video.url) {
      return res.status(404).json({
        success: false,
        error: 'No pitch video found'
      });
    }

    // Remove pitch video (no file deletion needed since it's just a link)
    application.pitch_video = undefined;
    await application.save();

    res.json({
      success: true,
      message: 'Pitch video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting video'
    });
  }
});

module.exports = router;
