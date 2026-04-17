export function maskEmail(email: string) {
  const [local, domain] = email.split("@")

  if (!local || !domain) {
    return email
  }

  if (local.length <= 2) {
    return `${local[0] ?? ""}***@${domain}`
  }

  return `${local.slice(0, 2)}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`
}
