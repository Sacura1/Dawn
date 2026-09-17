export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="lens-card lens-card--center" role="alert">
      <strong>Couldn’t fetch this one.</strong>
      <span>{message}</span>
      {onRetry ? (
        <button className="lens-text-button" type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

