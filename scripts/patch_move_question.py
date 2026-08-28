from pathlib import Path

path = Path('/home/ubuntu/reclutamiento-automatizado/server/routers.ts')
text = path.read_text()
start = text.index('    moveQuestion: adminProcedure')
end = text.index('\n', start)
replacement = '''    moveQuestion: adminProcedure.input(z.object({ id: z.number(), direction: z.enum(["up", "down"]) })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(`SELECT id,form_id,order_index FROM form_questions WHERE id=$1 FOR UPDATE`, [input.id]);
        if (!current.rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Pregunta no encontrada." });
        const delta = input.direction === "up" ? -1 : 1;
        const target = await client.query(`SELECT id,order_index FROM form_questions WHERE form_id=$1 AND order_index=$2 ORDER BY id LIMIT 1 FOR UPDATE`, [current.rows[0].form_id, current.rows[0].order_index + delta]);
        if (target.rows[0]) {
          await client.query(`UPDATE form_questions SET order_index=$1 WHERE id=$2`, [current.rows[0].order_index, target.rows[0].id]);
          await client.query(`UPDATE form_questions SET order_index=$1 WHERE id=$2`, [target.rows[0].order_index, current.rows[0].id]);
        }
        const result = await client.query(`SELECT * FROM form_questions WHERE id=$1`, [input.id]);
        await client.query("COMMIT");
        return result.rows[0];
      } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    }),'''
path.write_text(text[:start] + replacement + text[end:])
