import * as zod from 'zod'

export const manufacturerWebsiteSchema = zod.union([
  zod.literal(''),
  zod.url({ message: 'Enter a full address, such as https://www.example.com' }),
])
