/*
 * Published Workbench adapter.
 *
 * The normal desktop Workbench talks to a local Node server and keeps drafts on
 * the owner's disk. The shared site deliberately has no server, database, or
 * private asset endpoint: this adapter supplies a read-only catalogue snapshot,
 * browser-local drafts, and client-side downloads instead.
 */
(() => {
  const snapshotUrl = './data/static-data.json';
  const draftStoreKey = 'crystal-workbench-shared-drafts-v1';
  const nativeFetch = window.fetch.bind(window);
  let snapshotPromise;

  const json = (value, status = 200) => new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
  const requestPath = input => new URL(typeof input === 'string' ? input : input.url, window.location.href).pathname;
  const bodyJson = async options => {
    if (!options?.body) return {};
    return typeof options.body === 'string' ? JSON.parse(options.body) : JSON.parse(await options.body.text());
  };
  const snapshot = () => snapshotPromise ||= nativeFetch(snapshotUrl).then(async response => {
    if (!response.ok) throw new Error('共享目录快照未能加载。');
    return response.json();
  });
  const savedDrafts = () => {
    try {
      const value = JSON.parse(window.localStorage.getItem(draftStoreKey) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  };
  const writeDrafts = value => window.localStorage.setItem(draftStoreKey, JSON.stringify(value));
  const download = (text, type, filename) => {
    const href = URL.createObjectURL(new Blob([text], { type }));
    window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
    return { downloadUrl: href, filename };
  };
  const csv = assortment => {
    const headers = ['section', 'name', 'priority', 'themes', 'roles', 'preferred_forms', 'identity_status'];
    const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return [headers.join(','), ...(assortment?.items || []).map(item => [item.section, item.name, item.priority, (item.themes || []).join('|'), (item.roles || []).join('|'), (item.preferred_forms || []).join('|'), item.identity_status].map(quote).join(','))].join('\n');
  };
  const markdown = draft => `# ${draft.name || '未命名设计'}\n\nTheme: ${draft.theme || ''}\n\n## Notes\n${draft.notes || ''}\n`;

  window.__CRYSTAL_SHARED_WORKBENCH__ = true;
  window.fetch = async (input, options = {}) => {
    const pathname = requestPath(input);
    const method = (options.method || 'GET').toUpperCase();
    if (!pathname.startsWith('/api/')) return nativeFetch(input, options);
    if (pathname === '/api/data' && method === 'GET') return json((await snapshot()).data);
    if (pathname === '/api/local-assets') return json({ assets: [] });
    if (pathname === '/api/nature-launch') return json({ available: false, reason: 'PUBLISHED_SHARED_SNAPSHOT' });
    if (pathname === '/api/selection') return json({ available: false, reason: 'PUBLISHED_SHARED_SNAPSHOT' });
    if (pathname === '/api/drafts' && method === 'GET') return json({ drafts: Object.keys(savedDrafts()).sort((a, b) => a.localeCompare(b, 'zh-CN')) });

    const draftMatch = pathname.match(/^\/api\/drafts\/([^/]+)(?:\/export)?$/);
    if (draftMatch) {
      const name = decodeURIComponent(draftMatch[1]);
      const drafts = savedDrafts();
      if (pathname.endsWith('/export') && method === 'POST') {
        const draft = drafts[name];
        return draft ? json({ ok: true, ...download(markdown(draft), 'text/markdown;charset=utf-8', `${name}.md`) }) : json({ error: { message: '草稿不存在。' } }, 404);
      }
      if (method === 'GET') return drafts[name] ? json(drafts[name]) : json({ error: { message: '草稿不存在。' } }, 404);
      if (method === 'PUT' || method === 'POST') {
        const draft = await bodyJson(options);
        if (!draft?.name || !Array.isArray(draft.items)) return json({ error: { message: '草稿格式无效。' } }, 400);
        drafts[name] = draft;
        writeDrafts(drafts);
        return json({ ok: true, draft });
      }
    }
    if (pathname === '/api/studio-export' && method === 'POST') {
      const { draft, format } = await bodyJson(options);
      if (!draft || !format) return json({ error: { message: '导出内容无效。' } }, 400);
      const { exportDesign } = await import('./studio-view.mjs');
      const output = exportDesign(draft, format);
      return json(download(output.text, output.mime, `Crystal-${format}.${output.ext}`));
    }
    if (pathname === '/api/export/assortment' && method === 'GET') {
      const content = csv((await snapshot()).data.assortment);
      const output = download(content, 'text/csv;charset=utf-8', 'Crystal-assortment.csv');
      const link = document.createElement('a');
      link.href = output.downloadUrl;
      link.download = output.filename;
      link.click();
      return json({ ok: true, ...output });
    }
    return json({ error: { message: '共享版不提供此本机接口。' } }, 404);
  };
})();
