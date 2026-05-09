interface Props {
  advice: string | null;
  errorMessage?: string;
}

export function AiAdviceWidget({ advice, errorMessage }: Props) {
  const bullets = advice
    ? advice
        .split("\n")
        .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className="ai-advice-widget">
      <div className="widget-header">
        <h2>AI Advice</h2>
        <span className="ai-badge">Groq</span>
      </div>

      {errorMessage && !advice && (
        <p className="widget-error" role="alert">{errorMessage}</p>
      )}

      {bullets.length > 0 && (
        <ul className="advice-list">
          {bullets.map((bullet, i) => (
            <li key={i} className="advice-item">
              <span className="advice-dot" aria-hidden="true">✦</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
