import { handle } from '../server/core'
import { pgStore } from '../server/pg-store'

/** Vercel : même règles que sur Netlify, données dans la base Neon (PostgreSQL). */
const run = (req: Request) => handle(req, pgStore, process.env.APP_PASSWORD)
export const POST = run
export const OPTIONS = run
