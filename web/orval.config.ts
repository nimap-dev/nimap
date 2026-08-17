import { defineConfig } from 'orval'

export default defineConfig({
  nimap: {
    output: {
      mode: 'tags-split',
      target: 'src/api/nimap.ts',
      schemas: 'src/api/model',
      client: 'react-query',
    },
    input: {
      target: './nimap-openapi.yaml',
    },
  },
  nimapZod: {
    input: {
      target: './nimap-openapi.yaml',
    },
    output: {
      mode: 'tags-split',
      client: 'zod',
      target: 'src/api/endpoints',
      fileExtension: '.zod.ts',
    },
  },
})
