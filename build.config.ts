import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    'src/index.ts',
    'src/updater.ts',
  ],
  rollup: {
    emitCJS: true,
  },
})
