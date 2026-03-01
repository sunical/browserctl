export async function wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
    return { waited: ms };
}
//# sourceMappingURL=wait.js.map