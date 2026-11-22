import { MAYA_BASE, OTHERS } from "@/lib/data";
import { youSearch } from "@/lib/youcom";

export const dynamic = "force-dynamic";

// Runs You.com checks for each applicant: niche relevance and public reputation signals.
export async function GET() {
  const live = Boolean(process.env.YDC_API_KEY);
  const people = [MAYA_BASE, ...OTHERS];
  const results = await Promise.all(
    people.map(async (c) => {
      const [relevance, market] = await Promise.all([
        youSearch(`${c.handle} ${c.niche[0]} keyboard review`, 2),
        youSearch(`compact wireless mechanical keyboard ${c.niche[1] ?? c.niche[0]} 2026`, 2),
      ]);
      return { id: c.id, evidence: [...relevance, ...market] };
    }),
  );
  return Response.json({ live, results });
}
