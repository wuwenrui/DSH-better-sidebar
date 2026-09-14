/** Independent production build; never traverses the unrestricted sidebar entry graph. */
import type { UserConfig } from 'tsdown'
const external = ['react', 'react/jsx-runtime']
const output = 'dist/lawyer/package/lib'
export default [
  {
    entry: { index: 'src/lawyer/index.ts' }, outDir: output, format: 'esm', platform: 'node',
    external: ['@deepseek-ai/dsh-product-policy'], noExternal: id => id === '@deepseek-ai/dsh-product-policy' || id.startsWith('node:') ? undefined : true,
    dts: false, clean: false, sourcemap: false, outputOptions: { codeSplitting: false, entryFileNames: 'index.js' },
  },
  {
    entry: { client: 'src/lawyer/client/index.tsx' }, outDir: output, format: 'cjs', platform: 'browser',
    external, noExternal: id => external.includes(id) ? undefined : true,
    dts: false, clean: false, sourcemap: false,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    outputOptions: {
      codeSplitting: false, entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-better-sidebar", factory: (require) => {',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
] satisfies UserConfig[]
