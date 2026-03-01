export async function wait(ms: number): Promise<{ waited: number }> {
  await new Promise(resolve => setTimeout(resolve, ms))
  return { waited: ms }
}
