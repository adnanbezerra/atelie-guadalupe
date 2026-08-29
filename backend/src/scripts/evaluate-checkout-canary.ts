import "dotenv/config";
import { readFile } from "node:fs/promises";
import { evaluateCanaryRelease } from "./canary-release-safety";

async function main() {
    const path = process.env.CHECKOUT_CANARY_EVIDENCE_FILE?.trim();
    if (!path) throw new Error("missing evidence");
    const input = JSON.parse(await readFile(path, "utf8")) as unknown;
    const report = evaluateCanaryRelease(input);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.decision !== "ADVANCE") process.exitCode = 1;
}

void main().catch(() => {
    process.stderr.write("Evidencia canario invalida ou indisponivel\n");
    process.exitCode = 1;
});
