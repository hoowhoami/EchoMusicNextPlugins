import path from 'node:path';
import { readFile, mkdir, access } from 'node:fs/promises';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const execute = promisify(execFile);
export async function bakeShaders(source, staging, definitions, containedFile, relativePath, contract) {
  if (definitions === undefined) return;
  if (!Array.isArray(definitions) || definitions.length > 64) throw new Error('shaders must contain at most 64 entries');
  const compiler = process.env.ECHO_QSB || 'qsb';
  const { stdout } = await execute(compiler, ['--version'], { timeout: 10000 });
  if (!stdout.includes(contract.qtVersion)) throw new Error(`Shader compiler must match Qt ${contract.qtVersion}`);
  const outputs = new Set();
  for (const definition of definitions) {
    if (!definition || typeof definition !== 'object' || Object.keys(definition).some(key => !['source', 'output', 'target'].includes(key))) throw new Error('Shader requires source and output');
    const input = await containedFile(source, relativePath(definition.source));
    const target = relativePath(definition.output);
    if (!/\.(vert|frag|comp)$/.test(input) || !target.endsWith('.qsb') || outputs.has(target)) throw new Error('Invalid or duplicate shader output');
    outputs.add(target);
    const file = path.join(staging, target);
    try {await access(file); throw new Error(`Shader overwrites generated file: ${target}`);} catch(error) {if(error.code !== 'ENOENT') throw error;}
    // Includes are deliberately explicit and package-contained, including symlinks.
    const visited = new Set();
    const audit = async (shader, depth=0) => {
      if (visited.has(shader)) return;
      if (depth > 16) throw new Error('Shader include depth exceeds limit');
      visited.add(shader);
      const code = await readFile(shader,'utf8');
      if (Buffer.byteLength(code)>1024*1024) throw new Error('Shader source exceeds limit');
      for (const line of code.split('\n')) if (/^\s*#\s*include\b/.test(line)) {
        const match = line.match(/^\s*#\s*include\s*"([^"\n]+)"\s*(?:\/\/.*)?$/);
        if(!match) throw new Error('Shader includes must use a package-relative quoted path');
        const dependency = path.relative(source,path.resolve(path.dirname(shader),match[1])).split(path.sep).join('/');
        await audit(await containedFile(source,relativePath(dependency)),depth+1);
      }
    };
    await audit(input);
    await mkdir(path.dirname(file),{recursive:true});
    const compute=input.endsWith('.comp');
    if(!['quick','rhi'].includes(definition.target ?? 'rhi') || compute && definition.target==='quick')throw new Error('Invalid shader target');
    await execute(compiler,['--glsl',compute?'310 es,430':definition.target==='quick'?'100 es,120,150':'300 es,330','--hlsl','50','--msl','12','-o',file,input],{timeout:45000,maxBuffer:1024*1024});
    await validateShader(file, contract);
  }
}

export async function validateShader(file, contract) {
  const compiler=process.env.ECHO_QSB || 'qsb';
  const {stdout:dump}=await execute(compiler,['--dump',file],{timeout:10000,maxBuffer:4*1024*1024});
  if(!['SPIR-V','GLSL','HLSL','MSL'].every(target=>dump.includes(target))) throw new Error('Shader does not contain all portable backends');
}
