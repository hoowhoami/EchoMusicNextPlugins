import path from 'node:path';
import { readFile, writeFile, rename, readdir, mkdir } from 'node:fs/promises';
import { crc32, inflateRawSync } from 'node:zlib';
import { createHash, randomUUID } from 'node:crypto';

// Deterministic ZIP/STORE container: UTF-8, regular files only, fixed DOS epoch.
// The host's existing bounded Rust extractor validates paths, CRC and budgets.
// No shell zip utility or Node runtime is required on the user's machine.
export async function packPluginArchive(directory, destination) {
  const names = [];
  const walk = async (relative = '') => {
    for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (name === '.echo-build.json') continue;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) names.push(name);
      else throw new Error(`Plugin archive accepts regular files only: ${name}`);
    }
  };
  await walk();
  names.sort();
  const chunks = [],
    central = [];
  let offset = 0;
  for (const name of names) {
    const filename = Buffer.from(name, 'utf8');
    const data = await readFile(path.join(directory, name));
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50);
    header.writeUInt16LE(0x314, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x800, 8);
    header.writeUInt16LE(33, 14);
    header.writeUInt32LE(checksum, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(filename.length, 28);
    header.writeUInt32LE(0x81a40000, 38);
    header.writeUInt32LE(offset, 42);
    chunks.push(local, filename, data);
    central.push(header, filename);
    offset += local.length + filename.length + data.length;
  }
  const directoryBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...chunks, directoryBytes, end]);
  if (bytes.length > 128 * 1024 * 1024) throw new Error('Plugin archive exceeds 128 MiB');
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes, { flag: 'wx' });
  await rename(temporary, destination);
  return { file: destination, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function unpackPluginArchive(archive, destination) {
  if (!archive.toLowerCase().endsWith('.echomod')) throw new Error('Expected an .echomod package');
  const bytes = await readFile(archive);
  if (bytes.length > 128 * 1024 * 1024 || bytes.length < 22)
    throw new Error('Invalid plugin archive size');
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
  if (
    end < 0 ||
    bytes.readUInt32LE(end) !== 0x06054b50 ||
    end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length ||
    bytes.readUInt16LE(end + 4) ||
    bytes.readUInt16LE(end + 6)
  )
    throw new Error('Invalid plugin ZIP directory');
  const count = bytes.readUInt16LE(end + 10);
  let cursor = bytes.readUInt32LE(end + 16),
    total = 0;
  const directoryEnd = cursor + bytes.readUInt32LE(end + 12),
    seen = new Set();
  if (count > 4096 || count !== bytes.readUInt16LE(end + 8) || directoryEnd !== end)
    throw new Error('Invalid plugin entry count/directory');
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > directoryEnd || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw new Error('Invalid plugin entry');
    const flags = bytes.readUInt16LE(cursor + 8),
      method = bytes.readUInt16LE(cursor + 10);
    const checksum = bytes.readUInt32LE(cursor + 16),
      compressed = bytes.readUInt32LE(cursor + 20),
      size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28),
      extra = bytes.readUInt16LE(cursor + 30),
      comment = bytes.readUInt16LE(cursor + 32);
    const attributes = bytes.readUInt32LE(cursor + 38),
      local = bytes.readUInt32LE(cursor + 42);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength),
      name = nameBytes.toString('utf8');
    cursor += 46 + nameLength + extra + comment;
    if (
      cursor > directoryEnd ||
      !name ||
      name.includes('\\') ||
      name.includes(':') ||
      name.startsWith('/') ||
      name
        .split('/')
        .some(
          (part, index, parts) =>
            part === '..' || part === '.' || (!part && index !== parts.length - 1),
        ) ||
      !Buffer.from(name).equals(nameBytes) ||
      seen.has(name.toLowerCase()) ||
      ((attributes >>> 16) & 0xf000) === 0xa000 ||
      flags & 1 ||
      ![0, 8].includes(method)
    )
      throw new Error(`Unsafe or unsupported plugin entry: ${name}`);
    seen.add(name.toLowerCase());
    if (name.endsWith('/')) continue;
    total += size;
    if (
      total > 128 * 1024 * 1024 ||
      local + 30 > directoryEnd ||
      bytes.readUInt32LE(local) !== 0x04034b50
    )
      throw new Error('Plugin extraction budget/header invalid');
    const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
    if (start + compressed > directoryEnd) throw new Error('Invalid plugin file bounds');
    const data =
      method === 0
        ? bytes.subarray(start, start + compressed)
        : inflateRawSync(bytes.subarray(start, start + compressed), {
            maxOutputLength: Math.max(1, size),
          });
    if (data.length !== size || crc32(data) !== checksum)
      throw new Error(`Plugin checksum mismatch: ${name}`);
    const target = path.join(destination, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: 'wx' });
  }
  if (cursor !== directoryEnd || !seen.has('manifest.json'))
    throw new Error('Plugin requires root manifest.json');
  return destination;
}
