type TimelineItemProps = {
  time: string;
  title: string;
  description: string;
};

export function TimelineItem({ time, title, description }: TimelineItemProps) {
  return (
    <li className="timeline-item">
      <div className="timeline-dot" aria-hidden="true" />
      <div>
        <p className="timeline-time">{time}</p>
        <h3 className="timeline-title">{title}</h3>
        <p className="timeline-description">{description}</p>
      </div>
    </li>
  );
}
