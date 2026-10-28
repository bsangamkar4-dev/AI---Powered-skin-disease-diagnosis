import userService from './userService.js';
import Report from '../models/Report.js';
import Document from '../models/Document.js';
import { normalizeConfidencePercent } from '../utils/confidence.js';
import { completedReportOwnerQuery } from '../utils/reportOwnership.js';

const toIsoTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getDiagnosisTimestamp = (diagnosis) => {
  const candidates = [diagnosis.diagnosedAt, diagnosis.analyzedAt, diagnosis.createdAt];
  for (const candidate of candidates) {
    const timestamp = toIsoTimestamp(candidate);
    if (timestamp) return timestamp;
  }
  const objectIdDate = diagnosis._id?.getTimestamp?.();
  return toIsoTimestamp(objectIdDate);
};

const getDiagnosisKey = (diagnosis) => {
  const timestamp = getDiagnosisTimestamp(diagnosis);
  if (!timestamp) return diagnosis._id?.toString() || `${diagnosis.condition || ''}|${diagnosis.confidence ?? ''}`;

  return [
    diagnosis.condition || '',
    normalizeConfidencePercent(diagnosis.confidence) ?? '',
    timestamp,
  ].join('|');
};

class DashboardService {
  async getUserStats(userId) {
    try {
      const [user, recentReports, pendingAnalyses] = await Promise.all([
        userService.getUserByFirebaseUid(userId),
        Report.countDocuments(completedReportOwnerQuery(userId)),
        Document.countDocuments({
          userId,
          processingStatus: { $in: ['pending', 'processing'] },
        }),
      ]);

      const diagnoses = Array.isArray(user?.diagnosedDiseases) ? user.diagnosedDiseases : [];
      const uniqueDiagnoses = new Set(diagnoses.map(getDiagnosisKey));
      const latestDiagnosis = [...new Map(
        diagnoses.map((diagnosis) => [getDiagnosisKey(diagnosis), diagnosis])
      ).values()]
        .filter((diagnosis) => normalizeConfidencePercent(diagnosis.confidence) !== null)
        .sort((a, b) => new Date(getDiagnosisTimestamp(b) || 0) - new Date(getDiagnosisTimestamp(a) || 0))[0];

      return {
        // Use the diagnosis records, not the denormalized counter, which can
        // drift when older writes or retries increment it more than once.
        totalDiagnoses: uniqueDiagnoses.size,
        // Count saved PDF/report documents; a diagnosis alone is not a report.
        recentReports,
        // Image diagnosis runs synchronously; only persisted document jobs
        // with an existing pending/processing status are still in progress.
        pendingAnalyses,
        aiConfidence: latestDiagnosis
          ? normalizeConfidencePercent(latestDiagnosis.confidence)
          : null,
        totalQuestions: user?.stats?.totalQuestions || 0,
        totalDocuments: user?.stats?.totalDocuments || 0,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getRecentActivities(userId, limit = 10) {
    try {
      const [user, reports, documents] = await Promise.all([
        userService.getUserByFirebaseUid(userId),
        Report.find(completedReportOwnerQuery(userId))
          .sort({ generated_at: -1, createdAt: -1 })
          .select('_id diagnosis_details.condition confidence_score generated_at createdAt')
          .limit(100)
          .lean(),
        Document.find({ userId })
          .sort({ updatedAt: -1 })
          .select('_id originalName processingStatus createdAt updatedAt')
          .limit(100)
          .lean(),
      ]);

      const diagnosisRecords = Array.isArray(user?.diagnosedDiseases) ? user.diagnosedDiseases : [];
      const uniqueDiagnosisRecords = new Map();
      diagnosisRecords.forEach((diagnosis) => {
        const key = getDiagnosisKey(diagnosis);
        if (!uniqueDiagnosisRecords.has(key)) uniqueDiagnosisRecords.set(key, diagnosis);
      });

      const diagnosisActivities = [...uniqueDiagnosisRecords.entries()].map(([key, diagnosis]) => {
        const timestamp = getDiagnosisTimestamp(diagnosis);
        if (!timestamp) return null;
        const confidence = normalizeConfidencePercent(diagnosis.confidence);
        return {
          id: `diagnosis:${key}`,
          type: 'diagnosis',
          title: 'Skin Analysis Completed',
          description: `${diagnosis.condition || 'Skin analysis'} completed${confidence === null ? '' : ` with ${confidence}% confidence`}`,
          timestamp,
          status: 'completed',
        };
      }).filter(Boolean);

      const reportActivities = reports.map((report) => {
        const timestamp = toIsoTimestamp(report.generated_at || report.createdAt);
        if (!timestamp) return null;
        const condition = report.diagnosis_details?.condition;
        return {
          id: `report:${report._id.toString()}`,
          type: 'report',
          title: 'Report Generated',
          description: condition ? `Report generated for ${condition}` : 'Diagnosis report generated',
          timestamp,
          status: 'completed',
        };
      }).filter(Boolean);

      const documentActivities = documents.map((document) => {
        const isActive = ['pending', 'processing'].includes(document.processingStatus);
        const timestamp = toIsoTimestamp(isActive ? document.createdAt : document.updatedAt || document.createdAt);
        if (!timestamp) return null;
        const status = document.processingStatus || 'completed';
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return {
          id: `document:${document._id.toString()}`,
          type: 'document',
          title: `Document Analysis ${label}`,
          description: document.originalName || 'Document analysis',
          timestamp,
          status,
        };
      }).filter(Boolean);

      const parsedLimit = Number.parseInt(limit, 10);
      const safeLimit = Number.isFinite(parsedLimit) ? Math.max(0, Math.min(parsedLimit, 100)) : 10;
      return [...diagnosisActivities, ...reportActivities, ...documentActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, safeLimit);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      throw error;
    }
  }

  async getHealthInsights(userId) {
    const user = await userService.getUserByFirebaseUid(userId);
    const diagnoses = Array.isArray(user?.diagnosedDiseases) ? user.diagnosedDiseases : [];
    const latest = [...diagnoses]
      .filter((diagnosis) => normalizeConfidencePercent(diagnosis.confidence) !== null)
      .sort((a, b) => new Date(getDiagnosisTimestamp(b) || 0) - new Date(getDiagnosisTimestamp(a) || 0))[0];
    return {
      diagnosesOnRecord: new Set(diagnoses.map(getDiagnosisKey)).size,
      lastAnalysisAt: latest ? getDiagnosisTimestamp(latest) : null,
      latestConfidence: latest ? normalizeConfidencePercent(latest.confidence) : null,
      hasOutcomeData: false,
    };
  }

  async getDashboardOverview(userId) {
    try {
      const [stats, activities, insights] = await Promise.all([
        this.getUserStats(userId),
        this.getRecentActivities(userId, 5),
        this.getHealthInsights(userId),
      ]);

      return { stats, activities, insights };
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw error;
    }
  }
}

export default new DashboardService();
