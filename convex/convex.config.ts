import { defineApp } from "convex/server"

import betterAuthComponent from "./betterAuth/convex.config"

const app = defineApp()
app.use(betterAuthComponent)

export default app
