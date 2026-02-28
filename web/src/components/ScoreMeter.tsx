interface ScoreMeterProps {
  score: number;
  max?: number;
}

export function ScoreMeter({ score, max = 100 }: ScoreMeterProps) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <div className="score-meter" role="img" aria-label={`Score: ${score} out of ${max}`}>
      <div className="score-meter__bar">
        <div
          className="score-meter__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="score-meter__value">{score}</span>
    </div>
  );
}
