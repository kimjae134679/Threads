import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PublicationJournal } from '../publication-journal.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'threads-publish-journal-'));
let calls = 0;
const input = {
  provider: 'threads', candidateId: 'a', approvalBasis: 'revision-a', accountKey: 'synthetic-test-credential',
  payload: { text: 'Test only' },
  publish: async () => { calls += 1; return { id: 'test-double-id' }; },
};
try {
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => new PublicationJournal(root).execute(input)));
  assert.equal(calls, 1, 'Concurrent requests may perform only one external operation');
  assert.ok(results.some((result) => result.status === 'fulfilled'));
  const replay = await new PublicationJournal(root).execute(input);
  assert.equal(replay.replayed, true, 'A new journal instance must recover the confirmed result');
  assert.equal(replay.result.id, 'test-double-id');
  assert.equal(calls, 1);
  await assert.rejects(new PublicationJournal(root).execute({ ...input, payload: { text: 'Changed without reapproval' } }),
    (error) => error.code === 'publication_request_changed');
  const ambiguous = { ...input, candidateId: 'b', publish: async () => { calls += 1; throw new Error('timeout after dispatch'); } };
  await assert.rejects(new PublicationJournal(root).execute(ambiguous), /timeout/);
  await assert.rejects(new PublicationJournal(root).execute(ambiguous), (error) => error.code === 'publication_reconciliation_required');
  assert.equal(calls, 2, 'Ambiguous operations must never retry automatically');
  for (const directory of await fs.readdir(root)) {
    const content = await fs.readFile(path.join(root, directory, 'record.json'), 'utf8');
    assert.ok(!content.includes(input.accountKey), 'Credentials must not be stored');
  }
  console.log('Durable publication replay/concurrency/ambiguous-response guards passed with test doubles.');
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
