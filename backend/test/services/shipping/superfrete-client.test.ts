import * as assert from "node:assert";
import { test } from "node:test";
import {
    SuperFreteClient,
    validateSuperFreteRecipient
} from "../../../src/modules/shipping/services/superfrete-client";

test("SuperFrete cancellation sends the documented description field", async () => {
    const originalFetch = global.fetch;
    let requestBody: unknown;
    try {
        global.fetch = async (_input, init) => {
            requestBody = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        };
        const client = new SuperFreteClient({
            token: "token",
            userAgent: "test",
            baseUrl: "https://provider.invalid",
            timeoutMs: 100
        });

        await client.cancelOrder("sf-1");

        assert.deepStrictEqual(requestBody, {
            order: { id: "sf-1", description: "Cancelado pela integracao" }
        });
    } finally {
        global.fetch = originalFetch;
    }
});

test("SuperFrete recipient requires document only when checkout data is validated", () => {
    const recipient = {
        name: "Maria da Silva",
        address: "Rua A",
        number: "10",
        district: "Centro",
        city: "Sao Paulo",
        stateAbbr: "SP",
        postalCode: "01001000",
        document: ""
    };

    assert.equal(
        validateSuperFreteRecipient(recipient, 1),
        "Informe um CPF ou CNPJ para gerar a etiqueta"
    );
    assert.equal(
        validateSuperFreteRecipient({ ...recipient, document: "12345678901", phone: null }, 33),
        "Informe um telefone com 11 digitos para usar o servico J&T"
    );
    assert.equal(
        validateSuperFreteRecipient(
            { ...recipient, document: "12345678901", phone: "(11) 99999-9999" },
            33
        ),
        null
    );
});
