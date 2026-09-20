(function () {
  'use strict';
  const B = window.ThreadsSourceCut;
  const uuid = () => globalThis.crypto?.randomUUID?.() || 'edit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const clone = value => JSON.parse(JSON.stringify(value));
  function state(project) {
    const result = { title: project.title, appearance: clone(project.appearance), cover: clone(project.cover), rawCover: project.rawCover, referenceApproved: project.referenceApproved === true,
      pageLayouts: clone(project.pageLayouts || {}), source: clone(project.source || {}) };
    if (project.cover) {
      const asset = project.assets[project.cover.assetIndex], r = project.cover.rect;
      result.normalizedCover = { assetUid: asset.uid, x: r.x / asset.width, y: r.y / asset.height, width: r.width / asset.width, height: r.height / asset.height };
    }
    result.assetOrder = project.assets.map(a => a.uid);
    for (const a of project.assets) result['asset:' + a.uid] = { name: a.name, width: a.width, height: a.height, body: clone(a.body), cuts: [...a.cuts], normalizedCuts: a.cuts.map(y => y / a.height),
      normalizedBody: { x: a.body.x / a.width, y: a.body.y / a.height, width: a.body.width / a.width, height: a.body.height / a.height } };
    return result;
  }
  function record(project, before, action, reason = '') {
    const after = state(project), changes = [];
    for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after)])) {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after[key])) changes.push({ field: key, before: before?.[key] ?? null, after: after[key] ?? null });
    }
    if (!changes.length && action !== 'reason' && action !== 'export') return after;
    project.projectId ||= uuid(); project.editLog ||= [];
    project.editLog.push({ id: uuid(), at: new Date().toISOString(), action: String(action).slice(0, 80), userReason: String(reason).slice(0, 1000), changes });
    return after;
  }
  function newProject() { return { ...B.newProject(), projectId: uuid(), editLog: [], editingReason: '', referenceApproved: false }; }
  function restore(value) {
    const p = B.restore(value);
    p.projectId = /^[a-zA-Z0-9_-]{1,100}$/.test(value.projectId || '') ? value.projectId : uuid();
    p.referenceApproved = value.referenceApproved === true;
    p.editingReason = String(value.editingReason || '').slice(0, 1000);
    if (value.editLog != null && (!Array.isArray(value.editLog) || value.editLog.length > 10000 || JSON.stringify(value.editLog).length > 12000000)) throw new Error('편집 이력이 너무 큽니다. 원본 편집 파일과 로그를 따로 보관해주세요.');
    p.editLog = clone(value.editLog || []);
    if (p.editLog.some(e => !e || typeof e.id !== 'string' || typeof e.at !== 'string' || typeof e.action !== 'string' || !Array.isArray(e.changes))) throw new Error('편집 기록 형식을 확인해주세요.');
    return p;
  }
  function reference(project) {
    return { type: 'SOURCE_CUT_REFERENCE', version: 1, projectId: project.projectId, source: clone(project.source),
      finalState: state(project), editCount: project.editLog?.length || 0, approvedExample: project.referenceApproved === true,
      decisionPolicy: 'Coordinates and styles are observations; only userReason is a user-stated criterion. No inferred intent or automatic publication approval.',
      originalImages: project.assets.map(a => ({ uid: a.uid, name: a.name, width: a.width, height: a.height })),
      outputPages: B.slides(project).map(s => ({ key: s.key, type: s.type, assetUid: project.assets[s.assetIndex].uid, rect: s.rect, layout: B.pageStyle(project.pageLayouts?.[s.key]) })) };
  }
  window.ThreadsSourceCut = Object.freeze({ ...B, newProject, restore, historyState: state, recordEdit: record, reference });
})();
