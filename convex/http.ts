import { httpRouter } from "convex/server"

import { authComponent, createAuth } from "./betterAuth/config"

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

export default http
