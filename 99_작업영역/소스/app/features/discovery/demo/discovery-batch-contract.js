(function (global) {
  "use strict";

  function assertBatch(batch) {
    if (!batch || typeof batch !== "object" || !Array.isArray(batch.candidates)) {
      throw new Error("discovery_batch_invalid");
    }
    const seen = new Set();
    for (const candidate of batch.candidates) {
      if (!candidate || typeof candidate !== "object") throw new Error("discovery_candidate_invalid");
      if (!candidate.id || !candidate.source || !candidate.lane || !candidate.url || !candidate.title) {
        throw new Error("discovery_candidate_missing_identity");
      }
      const dedupeKey = String(candidate.url).trim().toLowerCase();
      if (seen.has(dedupeKey)) throw new Error("discovery_candidate_duplicate_url");
      seen.add(dedupeKey);
      if (candidate.publicationAllowed !== false || candidate.manualReviewRequired !== true) {
        throw new Error("discovery_candidate_not_fail_closed");
      }
      if (candidate.rightsState !== "UNKNOWN" && candidate.rightsState !== "CLEARED") {
        throw new Error("discovery_candidate_rights_invalid");
      }
      if (candidate.engagementCanonical !== true && candidate.observedEngagement != null) {
        throw new Error("discovery_noncanonical_engagement_must_be_null");
      }
      if (candidate.comfort === "BLOCK" && candidate.viralDecision === "APPROVE") {
        throw new Error("discovery_comfort_block_cannot_approve");
      }
    }
    return batch;
  }

  const api = { assertBatch };
  global.ThreadsDiscoveryBatchContract = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
