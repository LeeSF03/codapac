import { defineSchema } from "convex/server"

import { tables as authTables } from "./betterAuth/schema"

const schema = defineSchema({
  ...authTables,
})

export default schema
