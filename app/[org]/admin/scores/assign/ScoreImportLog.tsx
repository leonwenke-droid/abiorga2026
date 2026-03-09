"use client";

type LogEntry = {
  id: string;
  user_id: string;
  recipientName: string;
  points: number;
  reason: string;
  created_at: string;
  createdBy: string;
};

export default function ScoreImportLog({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "–";
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-cyan-500/25 bg-card/50 p-6">
      <h2 className="text-sm font-semibold text-cyan-300 mb-3">
        Protokoll: Individuell vergebene Punkte
      </h2>
      <p className="text-xs text-cyan-400/80 mb-4">
        Wann, wie viele Punkte, an wen, Begründung und Vergeber.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-cyan-500/20 text-left text-cyan-400/90">
              <th className="py-2 pr-4 font-medium">Datum & Uhrzeit</th>
              <th className="py-2 pr-4 font-medium">Empfänger</th>
              <th className="py-2 pr-4 font-medium text-right">Punkte</th>
              <th className="py-2 pr-4 font-medium">Begründung</th>
              <th className="py-2 font-medium">Vergeber</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-cyan-500/10 text-cyan-200/90">
                <td className="py-2.5 pr-4 whitespace-nowrap text-cyan-400/90">
                  {formatDate(e.created_at)}
                </td>
                <td className="py-2.5 pr-4">{e.recipientName}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums font-medium">
                  {e.points > 0 ? `+${e.points}` : e.points}
                </td>
                <td className="py-2.5 pr-4 max-w-[200px] truncate" title={e.reason}>
                  {e.reason}
                </td>
                <td className="py-2.5 text-cyan-400/80">{e.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
