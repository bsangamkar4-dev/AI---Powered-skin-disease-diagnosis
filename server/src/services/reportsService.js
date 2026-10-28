import Report from "../models/Report.js";
import geminiService from "./geminiService.js";
import pdfService from "./pdfService.js";

import userService from "./userService.js";
import { normalizeConfidencePercent } from "../utils/confidence.js";
import { PRODUCT_NAME } from "../config/branding.js";
import { reportOwnerQuery } from "../utils/reportOwnership.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReportsService {
  async generateReport(diagnosisData, userInfo = null) {
    try {
      console.log('🔄 Starting report generation for:', diagnosisData.condition);

      // Reuse a report already generated for this persisted diagnosis. This
      // keeps retries from creating duplicate report records or PDFs.
      if (userInfo?.uid && diagnosisData.id) {
        const existingReport = await Report.findOne({
          ...reportOwnerQuery(userInfo.uid),
          diagnosis_id: String(diagnosisData.id),
        });
        if (existingReport) return this.formatReportResult(existingReport);
      }
      
      // Fetch complete user data from MongoDB if available
      let completeUserData = null;
      if (userInfo?.uid) {
        try {
          completeUserData = await userService.getUserByFirebaseUid(userInfo.uid);
        } catch (error) {
          console.warn('Could not fetch user data from MongoDB:', error.message);
        }
      }

      // Generate AI content using Gemini
      const aiContent = await geminiService.generateReportContent(diagnosisData);

      // Prepare comprehensive patient information
      const patientInfo = this.preparePatientInfo(userInfo, completeUserData);

      // Diagnosis API confidence is normally a percentage (e.g. 90); accept a
      // fractional value too, while keeping one canonical percentage for PDF/UI.
      const confidencePercent = normalizeConfidencePercent(diagnosisData.confidence) ?? 0;
      const confidenceScore = confidencePercent / 100;

      // Prepare report data with enhanced structure
      const reportData = {
        patient_id: userInfo?.uid || `guest_${Date.now()}`,
        userId: userInfo?.uid,
        diagnosis_id: diagnosisData.id ? String(diagnosisData.id) : null,
        status: 'completed',
        patient_name: patientInfo.fullName,
        patient_info: patientInfo,
        report_type: "Dermatological Analysis Report",
        diagnosis_summary: `${diagnosisData.condition} detected with ${confidencePercent}% confidence`,
        confidence_score: confidenceScore,
        confidence_percent: confidencePercent,
        diagnosis_details: {
          condition: diagnosisData.condition,
          severity: this.determineSeverity(diagnosisData.confidence),
          affected_areas: diagnosisData.affectedAreas || [],
          symptoms: aiContent.commonSymptoms || [],
          recommendations: diagnosisData.recommendations || [],
          treatment_options: diagnosisData.treatmentOptions || [],
        },
        image_info: {
          original_filename: diagnosisData.originalFilename,
          image_url: diagnosisData.imageUrl,
          file_size: diagnosisData.fileSize,
          mime_type: diagnosisData.mimeType,
        },
        ai_content: aiContent,
        tags: this.generateTags(diagnosisData, aiContent),
        notes: "This is an AI-generated report. Consult a qualified dermatologist before taking any medical action.",
        generated_by: PRODUCT_NAME
      };

      // Generate PDF locally (primary method)
      console.log('📄 Generating PDF report...');
      const pdfResult = await pdfService.generateReportPDF(reportData, diagnosisData.imageUrl);
      
      // Update report data with PDF information
      reportData.local_file_path = pdfResult.relativePath;
      reportData.pdf_filename = pdfResult.filename;
      reportData.file_size = pdfResult.fileSize;
      reportData.report_content = pdfResult.htmlContent;

      // Using local storage only - no cloud dependencies
      console.log('📁 Using local storage only');
      reportData.appwrite_file_id = null;
      reportData.appwrite_file_url = null;

      // Save to MongoDB
      console.log('💾 Saving report to database...');
      const report = new Report(reportData);
      try {
        await report.save();
      } catch (saveError) {
        // A unique diagnosis key also covers simultaneous duplicate requests.
        if (saveError.code === 11000 && userInfo?.uid && diagnosisData.id) {
          const existingReport = await Report.findOne({
            ...reportOwnerQuery(userInfo.uid),
            diagnosis_id: String(diagnosisData.id),
          });
          if (existingReport) return this.formatReportResult(existingReport);
        }
        throw saveError;
      }

      console.log('✅ Report generated successfully:', report._id);

      return {
        id: report._id,
        reportId: report._id,
        pdfPath: pdfResult.relativePath,
        filename: pdfResult.filename,
        fileSize: pdfResult.fileSize,
        downloadUrl: `/api/reports/${report._id}/download`,
        condition: diagnosisData.condition,
        confidence: confidencePercent,
        patientName: patientInfo.fullName,
        generatedAt: report.generated_at,
        ...reportData,
      };
    } catch (error) {
      console.error("❌ Report generation error:", error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  formatReportResult(report) {
    const record = report.toObject ? report.toObject() : report;
    const confidence = normalizeConfidencePercent(
      record.confidence_percent ?? record.confidence_score
    );
    return {
      ...record,
      id: record._id,
      reportId: record._id,
      pdfPath: record.local_file_path,
      filename: record.pdf_filename,
      fileSize: record.file_size,
      downloadUrl: `/api/reports/${record._id}/download`,
      condition: record.diagnosis_details?.condition,
      confidence,
      patientName: record.patient_name,
      generatedAt: record.generated_at,
    };
  }

  async getUserReports(userId = null) {
    try {
      if (!userId) {
        return [];
      }

      const reports = await Report.find(reportOwnerQuery(userId))
        .sort({ generated_at: -1 })
        .select(
          "_id patient_name diagnosis_summary confidence_score confidence_percent generated_at diagnosis_details.condition local_file_path pdf_filename file_size download_count"
        )
        .limit(50);

      return reports.map((report) => ({
        id: report._id,
        patientName: report.patient_name,
        condition: report.diagnosis_details?.condition || "Unknown",
        confidence: report.confidence_percent ?? Math.round((report.confidence_score || 0) * 100),
        summary: report.diagnosis_summary,
        generatedAt: report.generated_at,
        downloadAvailable: true,
        downloadUrl: `/api/reports/${report._id}/download`,
        filename: report.pdf_filename,
        fileSize: report.file_size ? Math.round(report.file_size / 1024) : 0, // KB
        downloadCount: report.download_count || 0,
        storageType: 'local' // Local storage only
      }));
    } catch (error) {
      console.error("Error fetching user reports:", error);
      throw new Error("Failed to retrieve reports");
    }
  }

  async getReportById(id, userId = null) {
    try {
      if (!userId) throw new Error("Report not found");
      const query = { _id: id, ...reportOwnerQuery(userId) };

      const report = await Report.findOne(query);
      if (!report) {
        throw new Error("Report not found");
      }

      // Local storage only - direct download URL
      const downloadUrl = `/api/reports/${report._id}/download`;

      return {
        id: report._id,
        ...report.toObject(),
        downloadUrl,
      };
    } catch (error) {
      console.error("Error fetching report:", error);
      throw new Error("Failed to retrieve report");
    }
  }

  async getReportDownloadUrl(reportId, userId = null) {
    try {
      if (!userId) throw new Error("Report not found");
      const query = { _id: reportId, ...reportOwnerQuery(userId) };

      const report = await Report.findOne(query);
      if (!report) {
        throw new Error("Report not found");
      }

      // Always prioritize local file storage
      if (report.local_file_path) {
        return {
          type: "local",
          path: report.local_file_path,
          filename: report.pdf_filename || `report_${reportId}.pdf`,
          fileSize: report.file_size
        };
      }

      throw new Error('No downloadable file found for this report');
    } catch (error) {
      console.error("Error getting download URL:", error);
      throw new Error("Failed to get download URL");
    }
  }

  preparePatientInfo(userInfo, completeUserData) {
    const patientInfo = {
      fullName: 'Anonymous User',
      email: null,
      age: null,
      gender: null,
      phoneNumber: null,
      medicalHistory: {
        allergies: [],
        medications: [],
        conditions: [],
        skinType: 'unknown',
        skinConcerns: []
      }
    };

    // Use Firebase user info as base
    if (userInfo) {
      patientInfo.fullName = userInfo.displayName || userInfo.fullName || userInfo.email?.split('@')[0] || 'Anonymous User';
      patientInfo.email = userInfo.email;
    }

    // Enhance with MongoDB user data if available
    if (completeUserData) {
      patientInfo.fullName = completeUserData.displayName || 
        `${completeUserData.firstName || ''} ${completeUserData.lastName || ''}`.trim() || 
        patientInfo.fullName;
      
      patientInfo.email = completeUserData.email || patientInfo.email;
      patientInfo.phoneNumber = completeUserData.phoneNumber;
      patientInfo.gender = completeUserData.gender;
      
      // Calculate age from date of birth
      if (completeUserData.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(completeUserData.dateOfBirth);
        patientInfo.age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          patientInfo.age--;
        }
      }

      // Include medical history
      if (completeUserData.medicalHistory) {
        patientInfo.medicalHistory = {
          allergies: completeUserData.medicalHistory.allergies || [],
          medications: completeUserData.medicalHistory.medications || [],
          conditions: completeUserData.medicalHistory.conditions || [],
          skinType: completeUserData.medicalHistory.skinType || 'unknown',
          skinConcerns: completeUserData.medicalHistory.skinConcerns || []
        };
      }
    }

    return patientInfo;
  }

  determineSeverity(confidence) {
    if (confidence >= 0.9) return "High";
    if (confidence >= 0.7) return "Moderate";
    return "Low";
  }

  generateTags(diagnosisData, aiContent = null) {
    const tags = [];

    // Add condition tag
    if (diagnosisData.condition) {
      tags.push(diagnosisData.condition.toLowerCase().replace(/\s+/g, '_'));
    }

    // Add affected areas
    if (diagnosisData.affectedAreas) {
      tags.push(
        ...diagnosisData.affectedAreas.map((area) => area.toLowerCase().replace(/\s+/g, '_'))
      );
    }

    // Add severity tag
    const severity = this.determineSeverity(diagnosisData.confidence);
    tags.push(`severity_${severity.toLowerCase()}`);

    // Add confidence range tag
    const confidence = diagnosisData.confidence || 0;
    if (confidence >= 0.9) tags.push('high_confidence');
    else if (confidence >= 0.7) tags.push('moderate_confidence');
    else tags.push('low_confidence');

    // Add AI content tags if available
    if (aiContent?.commonSymptoms) {
      aiContent.commonSymptoms.slice(0, 3).forEach(symptom => {
        tags.push(symptom.toLowerCase().replace(/\s+/g, '_'));
      });
    }

    // Standard tags
    tags.push("dermatology", "image_analysis", "ai_diagnosis", "pdf_report");

    return [...new Set(tags)]; // Remove duplicates
  }

  // Legacy method for backward compatibility
  generateDownloadData(id, format = "json") {
    if (format === "pdf") {
      throw new Error("Use getReportDownloadUrl for PDF downloads");
    }

    // For JSON format, return basic structure
    return {
      data: { message: "Use new API endpoints for report data" },
      contentType: "application/json",
      filename: `report-${id}.json`,
    };
  }
}

export default new ReportsService();
