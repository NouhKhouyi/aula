import { handle } from "@/lib/server/http";
import { listMaterial } from "@/lib/server/material";

export const dynamic = "force-dynamic";

/** Text files in the vault's Material/ folder that a session can attach. */
export function GET() {
  return handle(async () => Response.json(await listMaterial()));
}
