import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Keep build dependencies isolated from the repository's legacy tooling.
const toolRoot = path.resolve(process.argv[2] || '.build-tools')
const root = path.resolve(process.argv[3] || fileURLToPath(new URL('../', import.meta.url)))
const toolRequire = createRequire(path.join(toolRoot, 'package.json'))
const versions = {
  '@babel/core': '8.0.7',
  '@babel/preset-env': '8.0.7',
  '@babel/plugin-transform-react-jsx': '8.0.1',
  rollup: '4.64.3',
}
for (const [name, expected] of Object.entries(versions)) {
  const actual = toolRequire(name + '/package.json').version
  if (actual !== expected) throw new Error(name + ': expected ' + expected + ', got ' + actual)
}
async function loadTool(name) {
  return import(pathToFileURL(toolRequire.resolve(name)).href)
}
const { transformAsync } = await loadTool('@babel/core')
const { default: presetEnv } = await loadTool('@babel/preset-env')
const { default: transformJSX } = await loadTool('@babel/plugin-transform-react-jsx')
const { rollup } = await loadTool('rollup')

const sourcePath = path.join(root, 'src/index.js')
const transformed = await transformAsync(fs.readFileSync(sourcePath, 'utf8'), {
  filename: sourcePath,
  babelrc: false,
  configFile: false,
  comments: true,
  sourceType: 'module',
  presets: [[presetEnv, { targets: { ie: '11' }, modules: false, useBuiltIns: false }]],
  plugins: [[transformJSX, { runtime: 'classic', pragma: 'React.createElement' }]],
})
const entry = '\0react-displaceable-source'
const bundle = await rollup({
  input: entry,
  external: ['react', 'displaceable'],
  plugins: [{ name: 'audited-source', resolveId: id => id === entry ? entry : null, load: id => id === entry ? transformed.code : null }],
})
fs.mkdirSync(path.join(root, 'dist'), { recursive: true })
for (const [format, filename] of [['cjs', 'react-displaceable.js'], ['es', 'react-displaceable.m.js'], ['umd', 'react-displaceable.umd.js']]) {
  await bundle.write({
    file: path.join(root, 'dist', filename),
    format,
    name: 'reactDisplaceable',
    globals: { react: 'react', displaceable: 'displaceable' },
    exports: 'default',
    interop: 'compat',
    generatedCode: 'es5',
    sourcemap: false,
  })
}
await bundle.close()
console.log('Built CJS, ESM and UMD with Babel8.0.7 and Rollup4.64.3')
