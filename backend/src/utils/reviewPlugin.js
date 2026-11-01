/**
 * Listings edited after approval stay online: the edit is flagged for the admin to check instead of taking the
 * listing offline (decision of 2026-11-01). Used by hotels, houses, sale listings and investment projects.
 */
export function reviewPlugin(schema) {
  schema.add({
    changesToReview: { type: Boolean, default: false, index: true }, // edited by its owner since the last approval
    changedAt: { type: Date },
  });
}

/**
 * Call after an owner (not an admin) edits a listing:
 * approved → stays online, flagged for the admin; pending / rejected → (back) in the approval queue.
 */
export function afterOwnerEdit(doc) {
  if (doc.status === 'approved') {
    doc.changesToReview = true;
    doc.changedAt = new Date();
  } else {
    doc.status = 'pending';
    doc.rejectionReason = '';
  }
}
