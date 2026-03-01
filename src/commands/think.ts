// No-op: lets agents log their reasoning without performing any browser action.
export function think(reasoning: string): { reasoning: string } {
  return { reasoning }
}
