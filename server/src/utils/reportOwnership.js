export const reportOwnerQuery = (userId) => ({
  $or: [
    { patient_id: userId },
    { userId },
  ],
});

export const completedReportOwnerQuery = (userId) => ({
  $and: [
    reportOwnerQuery(userId),
    // Older reports predate the status field and are saved only after their
    // PDF has been generated, so a missing status still represents a report.
    { $or: [{ status: 'completed' }, { status: null }] },
  ],
});
