globalThis.fetch = async (input) => {
    throw new Error(`Unexpected external network request in test suite: ${String(input)}`);
};
