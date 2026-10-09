import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const conflict = (code, message) => Object.assign(new Error(message), { status: 409, code });

export class PublicationJournal {
  constructor(root) { this.root = path.resolve(root); }

  async execute({ provider, candidateId, approvalBasis, accountKey, payload, publish }) {
    if (!candidateId || !approvalBasis || !accountKey) throw conflict('publication_identity_required', '게시 후보·승인·계정 식별값이 필요합니다.');
    // Store only hashes of account credentials and approved request content.
    const key = digest(JSON.stringify([provider, candidateId, approvalBasis, digest(accountKey)]));
    const fingerprint = digest(JSON.stringify(payload));
    const directory = path.join(this.root, key);
    const recordPath = path.join(directory, 'record.json');
    await fs.mkdir(this.root, { recursive: true });
    try {
      // Creating a directory is an atomic claim, including across server processes.
      await fs.mkdir(directory, { mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let record;
      try { record = JSON.parse(await fs.readFile(recordPath, 'utf8')); }
      catch { throw conflict('publication_reconciliation_required', '게시 요청이 진행 중이거나 결과가 불명확합니다. 실제 플랫폼 상태를 확인하세요.'); }
      if (record.fingerprint !== fingerprint) throw conflict('publication_request_changed', '같은 승인으로 다른 게시 요청을 보낼 수 없습니다.');
      if (record.state === 'confirmed') return { result: record.result, replayed: true };
      throw conflict('publication_reconciliation_required', '게시 결과가 아직 확인되지 않았습니다. 중복 게시 방지를 위해 자동 재시도하지 않습니다.');
    }

    const startedAt = new Date().toISOString();
    await writeRecord(recordPath, { provider, fingerprint, state: 'pending', startedAt });
    // Any error after this point leaves the claim intact. A timeout may mean the
    // remote post exists even though its response never reached this server.
    const result = await publish();
    await writeRecord(recordPath, { provider, fingerprint, state: 'confirmed', startedAt,
      confirmedAt: new Date().toISOString(), result });
    return { result, replayed: false };
  }
}

async function writeRecord(file, record) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(record) + '\n', { mode: 0o600, flag: 'wx' });
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}
