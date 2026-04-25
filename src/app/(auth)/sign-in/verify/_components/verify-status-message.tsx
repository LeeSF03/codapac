type VerifyStatusMessageProps = {
  error: string | null
  verifying: boolean
}

export function VerifyStatusMessage({
  error,
  verifying,
}: VerifyStatusMessageProps) {
  return (
    <div className="min-h-[1.25rem] text-center text-[12px]">
      {error ? (
        <span className="text-destructive">{error}</span>
      ) : verifying ? (
        <span className="text-muted-foreground">Verifying...</span>
      ) : (
        <span className="text-muted-foreground">
          Codes expire after 10 minutes.
        </span>
      )}
    </div>
  )
}
