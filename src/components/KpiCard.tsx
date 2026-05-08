type KpiCardProps = {
  label: string;
  value: string;
  delta: string;
  tone?: "good" | "neutral" | "warning";
};

export function KpiCard({ label, value, delta, tone = "neutral" }: KpiCardProps) {
  return (
    <article className="kpi-card" data-tone={tone}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      <p className="kpi-delta">{delta}</p>
    </article>
  );
}
