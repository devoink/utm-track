import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/utm-track.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: 'tsconfig.json' })],
  },
  {
    input: 'src/script.ts',
    output: {
      file: 'dist/utm-track.umd.js',
      format: 'umd',
      name: 'UtmTrack',
      sourcemap: true,
    },
    plugins: [typescript({ tsconfig: 'tsconfig.json' })],
  },
];
