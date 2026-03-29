import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

describe('GET /health', () => {
  let app, server;

  after(async () => {
    if (server) server.close();
  });

  it('responds 200 with status ok', async () => {
    // Set PORT to avoid conflict
    process.env.PORT = '0'; // 0 = random available port
    process.env.SITE_BASE_PATH = process.cwd().replace(/[\\/]autopilot$/, '');

    const mod = await import('../server.js');
    app = mod.app;
    server = mod.server;

    // Wait for server to be listening
    await new Promise(resolve => {
      if (server.listening) return resolve();
      server.on('listening', resolve);
    });

    const addr = server.address();
    const res = await fetch(`http://localhost:${addr.port}/health`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
  });
});
