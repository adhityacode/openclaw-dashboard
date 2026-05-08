type QuickActionButtonProps = {
  label: string;
};

export function QuickActionButton({ label }: QuickActionButtonProps) {
  return (
    <button className="quick-action" type="button">
      {label}
    </button>
  );
}
