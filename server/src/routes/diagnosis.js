import express from 'express';
import { uploadImage, handleUploadError } from '../middleware/upload.js';
import { optionalAuth } from '../middleware/auth.js';
import diagnosisService from '../services/diagnosisService.js';
import userService from '../services/userService.js';

const router = express.Router();

// Analyze skin image
router.post('/analyze', optionalAuth, uploadImage.single('image'), handleUploadError, async (req, res) => {
  try {
    diagnosisService.validateImageFile(req.file);

    // Always use the canonical Firebase UID from the auth middleware.
    // The middleware sets req.user.uid (not req.user.userId).
    const firebaseUid = req.user?.uid || null;

    const result = await diagnosisService.analyzeImage(req.file, firebaseUid);

    // Persist the diagnosis for authenticated users. If a Firebase user exists
    // but their MongoDB profile is missing, create it automatically so the
    // diagnosis is not lost.
    if (firebaseUid) {
      try {
        let mongoUser = await userService.getUserByFirebaseUid(firebaseUid);

        if (!mongoUser) {
          console.log('⚠️  MongoDB profile missing; creating profile for:', firebaseUid);
          mongoUser = await userService.createUser({
            firebaseUid,
            email: req.user.email || `user-${firebaseUid}@example.com`,
            displayName: req.user.displayName || req.user.email?.split('@')[0] || 'User',
            photoURL: req.user.photoURL || null,
            phoneNumber: req.user.phoneNumber || null,
            emailVerified: req.user.emailVerified || false
          });
        }

        if (mongoUser) {
          await userService.addDiagnosis(firebaseUid, result);
          console.log('✅ Diagnosis persisted for user:', firebaseUid);
        }
      } catch (persistErr) {
        console.warn('⚠️  Diagnosis computed but not persisted to user:', persistErr.message);
      }
    }

    // Check if user wants to generate report automatically
    const { generateReport = false } = req.body;
    let reportInfo = null;

    if (generateReport && req.user) {
      try {
        const report = await diagnosisService.generateReportForDiagnosis(result, req.user);
        reportInfo = {
          reportId: report.id,
          downloadUrl: report.downloadUrl,
          message: 'Report generated successfully'
        };
      } catch (reportError) {
        console.warn('⚠️  Report generation failed:', reportError.message);
        reportInfo = {
          error: 'Report generation failed',
          message: reportError.message
        };
      }
    }

    console.log("Analysis completed..........");

    res.json({
      message: 'Image analyzed successfully',
      result,
      report: reportInfo
    });
  } catch (error) {
    console.error('Analysis error:', error);

    if (error.message === 'No image provided' || error.message === 'Please upload an image file') {
      return res.status(400).json({
        error: 'Invalid file',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Analysis failed',
      message: process.env.NODE_ENV === 'production' ? 'Failed to analyze the image' : (error.message || 'Failed to analyze the image')
    });
  }
});

// Get analysis history (requires authentication)
router.get('/history', optionalAuth, (req, res) => {
  try {
    const history = diagnosisService.getAnalysisHistory(req.user?.uid);

    res.json({
      message: 'Analysis history retrieved successfully',
      history
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      error: 'Failed to retrieve history',
      message: 'Internal server error'
    });
  }
});

// Get specific analysis by ID
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const analysis = diagnosisService.getAnalysisById(id, req.user?.uid);

    res.json({
      message: 'Analysis retrieved successfully',
      analysis
    });
  } catch (error) {
    console.error('Analysis retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis',
      message: 'Internal server error'
    });
  }
});

export default router;