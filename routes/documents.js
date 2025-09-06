const express = require('express');
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { Application } = require('../models');
const { protect } = require('../middleware/auth');

const router = express.Router();

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
    resource_type: 'auto', // Automatically detect file type (image, video, raw)
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

// @desc    Serve document file directly (proxy for Cloudinary)
// @route   GET /api/documents/serve/:applicationId/:documentId
// @access  Private
router.get('/serve/:applicationId/:documentId', protect, async (req, res) => {
  try {
    const { applicationId, documentId } = req.params;
    
    // Find the application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    // Find the document
    const document = application.documents.find(doc => doc._id.toString() === documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    // Check if user owns this application
    if (application.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this document'
      });
    }
    
    // Try to make the document public first, then generate signed URL
    try {
      // First, try to make the document public
      await cloudinary.api.update(document.cloudinary_id, {
        resource_type: 'image',
        type: 'upload',
        access_mode: 'public'
      });
      
      // Generate a signed URL for the document
      const signedUrl = cloudinary.utils.download_url(document.cloudinary_id, {
        resource_type: 'image',
        type: 'upload',
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      });
      
      // Redirect to the signed URL
      res.redirect(signedUrl);
    } catch (cloudinaryError) {
      console.error('Cloudinary access error:', cloudinaryError);
      
      // If making public fails, try direct access anyway
      try {
        const directUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${document.cloudinary_id}`;
        res.redirect(directUrl);
      } catch (directError) {
        console.error('Direct access also failed:', directError);
        res.status(500).json({
          success: false,
          error: 'Document access is blocked. Please contact administrator to make documents public in Cloudinary.',
          details: 'Access control is set to "Blocked for delivery" in Cloudinary'
        });
      }
    }
    
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
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
        documents: uploadedDocuments
      }
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;