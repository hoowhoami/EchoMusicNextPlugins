import type { BackupProviderEntry, NetworkRequestOptions, NetworkResponse } from 'echo:plugin-sdk';

export interface WebDavConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  directory: string;
  rememberPassword: boolean;
}
export type Send = (options: NetworkRequestOptions) => Promise<NetworkResponse>;
export const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const EXTENSION = '.echonext-backup';
const PROPFIND =
  '<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getlastmodified/><d:getcontentlength/></d:prop></d:propfind>';
export const DEFAULT_CONFIG: WebDavConfig = {
  enabled: false,
  url: '',
  username: '',
  password: '',
  directory: 'EchoMusicNext',
  rememberPassword: false,
};

export function normalizeConfig(value: unknown): WebDavConfig {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const text = (key: string, fallback = '') =>
    typeof source[key] === 'string' ? (source[key] as string) : fallback;
  return {
    enabled: source.enabled === true,
    url: text('url').trim(),
    username: text('username').trim(),
    password: text('password'),
    directory: text('directory', DEFAULT_CONFIG.directory).trim() || DEFAULT_CONFIG.directory,
    rememberPassword: source.rememberPassword === true,
  };
}
export function persistedConfig(value: WebDavConfig): WebDavConfig {
  return { ...value, password: value.rememberPassword ? value.password : '' };
}

// These bounded HTTP URL operations use only ES2016 primitives available in Qt.
// Credentials/query/fragment are deliberately not accepted as endpoint syntax.
function parseUrl(value: string): { origin: string; path: string } {
  const match = /^(https?):\/\/(\[[0-9a-f:.%]+\]|[^\s\/@:?#]+)(?::([0-9]+))?(\/[^?#]*)?$/i.exec(
    value,
  );
  if (!match || value.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(value))
    throw new Error('WebDAV 服务地址无效，请填写不含凭据、查询参数或锚点的 HTTP(S) 地址');
  const port = match[3] ? Number(match[3]) : undefined;
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535))
    throw new Error('WebDAV 服务端口无效');
  const scheme = match[1].toLowerCase();
  const origin =
    scheme +
    '://' +
    match[2].toLowerCase() +
    (port && !((scheme === 'https' && port === 443) || (scheme === 'http' && port === 80))
      ? ':' + port
      : '');
  let path: string;
  try {
    path = (match[4] || '/')
      .split('/')
      .map((segment) => {
        const decoded = decodeURIComponent(segment);
        if (decoded === '.' || decoded === '..' || /[\/\\\u0000-\u001f\u007f]/.test(decoded))
          throw new Error('path');
        return encodeURIComponent(decoded);
      })
      .join('/');
  } catch {
    throw new Error('WebDAV 地址路径包含无效编码或目录段');
  }
  return { origin, path };
}

export function resolveConfig(value: unknown): WebDavConfig {
  const config = normalizeConfig(value);
  if (!config.url) throw new Error('请填写 WebDAV 服务地址');
  const endpoint = parseUrl(config.url);
  if (
    config.username.length > 256 ||
    config.password.length > 4096 ||
    /[:\u0000-\u001f\u007f]/.test(config.username) ||
    /[\u0000-\u001f\u007f]/.test(config.password)
  )
    throw new Error('WebDAV 用户名或密码格式无效');
  if (Boolean(config.username) !== Boolean(config.password))
    throw new Error('请同时填写 WebDAV 用户名和密码');
  const segments = config.directory.replace(/\\/g, '/').split('/').filter(Boolean);
  if (
    !segments.length ||
    segments.length > 20 ||
    segments.some(
      (s) => s === '.' || s === '..' || s.length > 100 || /[\u0000-\u001f\u007f]/.test(s),
    )
  )
    throw new Error('远端目录无效，请使用不含 . 或 .. 的相对目录');
  basicAuthorization(config.username, config.password);
  return {
    ...config,
    url: endpoint.origin + endpoint.path.replace(/\/*$/, '/'),
    directory: segments.join('/'),
  };
}
export function directoryUrl(value: unknown): string {
  const config = resolveConfig(value);
  return config.url + config.directory.split('/').map(encodeURIComponent).join('/') + '/';
}
function fileName(value: string): string {
  if (
    !value ||
    value !== value.trim() ||
    value.length > 240 ||
    !value.toLowerCase().endsWith(EXTENSION) ||
    /[\/\\\u0000-\u001f\u007f]/.test(value)
  )
    throw new Error('备份文件名无效');
  return value;
}
export function fileUrl(config: WebDavConfig, name: string): string {
  return directoryUrl(config) + encodeURIComponent(fileName(name));
}
export function basicAuthorization(username: string, password: string): string {
  if (!username && !password) return '';
  let bytes: string;
  try {
    bytes = encodeURIComponent(username + ':' + password).replace(
      /%([0-9A-F]{2})/g,
      (_, n: string) => String.fromCharCode(parseInt(n, 16)),
    );
  } catch {
    throw new Error('WebDAV 用户名或密码包含无效字符');
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes.charCodeAt(i),
      b = bytes.charCodeAt(i + 1),
      c = bytes.charCodeAt(i + 2);
    encoded +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | ((b || 0) >> 4)] +
      (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | ((c || 0) >> 6)] : '=') +
      (i + 2 < bytes.length ? alphabet[c & 63] : '=');
  }
  return 'Basic ' + encoded;
}
function status(response: NetworkResponse, expected: number[], action: string): NetworkResponse {
  if (expected.includes(response.status)) return response;
  const detail =
    response.status === 401
      ? '，请检查用户名和应用专用密码'
      : response.status === 403
        ? '，请检查目录访问权限'
        : response.status >= 300 && response.status < 400
          ? '，请填写重定向后的最终 WebDAV 地址'
          : response.status === 507
            ? '，远端存储空间不足'
            : '';
  throw new Error(`${action}失败（HTTP ${response.status || 0}）${detail}`);
}
function decodeXml(value: string): string {
  return value.replace(
    /<!\[CDATA\[([\s\S]*?)\]\]>|&(quot|apos|lt|gt|amp|#x[0-9a-f]+|#[0-9]+);/gi,
    (whole, cdata: string | undefined, entity: string | undefined) => {
      if (cdata !== undefined) return cdata;
      const name = entity || '';
      const named: Record<string, string> = { quot: '\"', apos: "'", lt: '<', gt: '>', amp: '&' };
      if (named[name]) return named[name];
      const code =
        name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : '';
    },
  );
}
const tags = (name: string) =>
  new RegExp(
    `<(?:(?:[\\w.-]+):)?${name}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[\\w.-]+):)?${name}\\s*>`,
    'gi',
  );
function tag(block: string, name: string): string {
  const raw = (block.match(tags(name)) || [])[0];
  return raw
    ? decodeXml(
        raw
          .replace(/^<[^>]*>|<\/[^>]*>$/g, '')
          .replace(/<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>/g, (part) =>
            part.startsWith('<![CDATA[') ? part : '',
          ),
      ).trim()
    : '';
}
function validateDavXml(xml: string): void {
  if (
    !/<(?:(?:[\w.-]+):)?multistatus\b/i.test(xml) ||
    !/<\/(?:(?:[\w.-]+):)?multistatus\s*>/i.test(xml) ||
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  )
    throw new Error('WebDAV 返回的备份列表不是有效的 DAV XML');
}
export function parseEntries(xml: string, base: string): BackupProviderEntry[] {
  validateDavXml(xml);
  const directory = parseUrl(base);
  const entries: BackupProviderEntry[] = [],
    seen = new Set<string>();
  for (const block of xml.replace(/<!--[\s\S]*?-->/g, '').match(tags('response')) || []) {
    const outerStatus = tag(block.replace(tags('propstat'), ''), 'status');
    if (outerStatus && !/\s2[0-9]{2}(?:\s|$)/.test(outerStatus)) continue;
    const props = (block.match(tags('propstat')) || [])
      .filter((p) => /\s2[0-9]{2}(?:\s|$)/.test(tag(p, 'status')))
      .join('');
    if (/<(?:(?:[\w.-]+):)?collection\b/i.test(props)) continue;
    const href = tag(block, 'href');
    if (!href) continue;
    let resource: { origin: string; path: string };
    try {
      resource = parseUrl(
        /^https?:\/\//i.test(href)
          ? href
          : href.startsWith('//')
            ? directory.origin.split(':')[0] + ':' + href
            : directory.origin + (href.startsWith('/') ? href : directory.path + href),
      );
    } catch {
      continue;
    }
    if (resource.origin !== directory.origin || !resource.path.startsWith(directory.path)) continue;
    const relative = resource.path.slice(directory.path.length);
    if (!relative || relative.includes('/')) continue;
    let name: string;
    try {
      name = fileName(decodeURIComponent(relative));
    } catch {
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    const date = new Date(tag(props, 'getlastmodified'));
    const sizeText = tag(props, 'getcontentlength'),
      size = Number(sizeText);
    entries.push({
      id: name,
      name,
      ...(Number.isFinite(date.getTime()) ? { createdAt: date.toISOString() } : {}),
      ...(sizeText && Number.isSafeInteger(size) && size >= 0 ? { size } : {}),
    });
  }
  return entries
    .sort(
      (a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '') || a.name.localeCompare(b.name),
    )
    .slice(0, 500);
}

export function createClient(value: unknown) {
  const config = resolveConfig(value),
    directory = directoryUrl(config);
  const authorization = basicAuthorization(config.username, config.password);
  let ready = false;
  const request = (send: Send, options: NetworkRequestOptions) =>
    send({
      timeoutMs: 120000,
      maxRedirects: 0,
      maxResponseBytes: 65536,
      ...options,
      headers: {
        Accept: '*/*',
        ...(authorization ? { Authorization: authorization } : {}),
        ...options.headers,
      },
    });
  const find = (send: Send, url: string, depth: number) =>
    request(send, {
      url,
      method: 'PROPFIND',
      headers: { Depth: String(depth), 'Content-Type': 'application/xml; charset=utf-8' },
      body: PROPFIND,
      responseType: 'text',
      maxResponseBytes: 4 * 1024 * 1024,
    }).then((response) => {
      if (response.status === 200 || response.status === 207) {
        if (typeof response.data !== 'string') throw new Error('WebDAV 响应不是 DAV XML');
        validateDavXml(response.data);
      }
      return response;
    });
  const ensure = (send: Send): Promise<string> => {
    if (ready) return Promise.resolve(directory);
    return find(send, config.url, 0)
      .then((r) => {
        status(r, [200, 207], '访问 WebDAV 服务');
      })
      .then(() => {
        let url = config.url;
        return config.directory.split('/').reduce(
          (chain, segment) =>
            chain.then(() => {
              url += encodeURIComponent(segment) + '/';
              return find(send, url, 0).then((r) => {
                if (r.status === 200 || r.status === 207) return undefined;
                status(r, [404], '访问远端目录');
                return request(send, { url, method: 'MKCOL', responseType: 'text' }).then(
                  (created) => {
                    if (created.status === 405)
                      return find(send, url, 0).then((found) => {
                        status(found, [200, 207], '确认远端目录');
                      });
                    status(created, [200, 201, 204], '创建远端目录');
                    return undefined;
                  },
                );
              });
            }),
          Promise.resolve(),
        );
      })
      .then(() => {
        ready = true;
        return directory;
      });
  };
  return {
    description: parseUrl(config.url).origin.replace(/^https?:\/\//, '') + ' · ' + config.directory,
    test: (send: Send) => ensure(send),
    save: (send: Send, name: string, data: ArrayBuffer) => {
      fileName(name);
      if (
        !(data instanceof ArrayBuffer) ||
        data.byteLength === 0 ||
        data.byteLength > MAX_ARCHIVE_BYTES
      )
        return Promise.reject(new Error('备份归档超过 256 MiB 或格式无效'));
      return ensure(send)
        .then(() =>
          request(send, {
            url: fileUrl(config, name),
            method: 'PUT',
            body: data,
            maxRequestBytes: data.byteLength,
            responseType: 'text',
            headers: { 'Content-Type': 'application/octet-stream' },
          }),
        )
        .then((r) => {
          status(r, [200, 201, 204], '上传备份');
        });
    },
    list: (send: Send) =>
      ensure(send)
        .then(() => find(send, directory, 1))
        .then((r) => {
          status(r, [200, 207], '读取备份列表');
          if (typeof r.data !== 'string') throw new Error('WebDAV 列表响应格式无效');
          return parseEntries(r.data, directory);
        }),
    load: (send: Send, id: string) => {
      fileName(id);
      return ensure(send)
        .then(() =>
          request(send, {
            url: fileUrl(config, id),
            method: 'GET',
            responseType: 'arrayBuffer',
            maxResponseBytes: MAX_ARCHIVE_BYTES,
          }),
        )
        .then((r) => {
          status(r, [200], '下载备份');
          if (!(r.data instanceof ArrayBuffer)) throw new Error('WebDAV 未返回二进制备份');
          return r.data;
        });
    },
    remove: (send: Send, id: string) => {
      fileName(id);
      return ensure(send)
        .then(() =>
          request(send, { url: fileUrl(config, id), method: 'DELETE', responseType: 'text' }),
        )
        .then((r) => {
          status(r, [200, 202, 204, 404], '删除备份');
        });
    },
  };
}
