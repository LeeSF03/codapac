"server-only"

const EMBEDDING_DIMENSIONS = 256

function hashToken(token: string) {
  let hash = 2166136261
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function tokenize(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const words = normalized ? normalized.split(" ") : []
  const ngrams: string[] = []
  for (const word of words) {
    if (word.length <= 3) {
      ngrams.push(word)
      continue
    }
    for (let index = 0; index <= word.length - 3; index += 1) {
      ngrams.push(word.slice(index, index + 3))
    }
  }

  return [...words, ...ngrams]
}

export function embedText(text: string) {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
  const tokens = tokenize(text)

  if (tokens.length === 0) {
    return vector
  }

  for (const token of tokens) {
    const hash = hashToken(token)
    const index = hash % EMBEDDING_DIMENSIONS
    const sign = (hash & 1) === 0 ? 1 : -1
    const weight = token.length <= 3 ? 0.75 : 1
    vector[index] += sign * weight
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  )

  if (magnitude === 0) {
    return vector
  }

  return vector.map((value) => Number((value / magnitude).toFixed(8)))
}

export { EMBEDDING_DIMENSIONS }
