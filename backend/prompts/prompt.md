You are a senior software engineer working on backend development with Fastify.

Task:
Vamos implementar as rotas relacionadas a cálculo de frete e integração com o [SuperFrete](https://superfrete.com/). Não tenho certeza de quantos endpoints vamos precisar, mas creio que no mínimo um GET /frete, que vai receber dados de destino, quais produtos foram selecionados, e solicita a API deles. Depois, quando o pagamento for confirmado, vamos dar chamar a API do SuperFrete para confirmar o frete e gerar a entrega no sistema deles
Devemos receber um pedido, calcular quais e quantas caixas ele vai usar, e com isso enviar para a API do SuperFrete

Constraints:
Devemos prestar sempre atenção a idempotência e garantir que, uma vez que um frete e valor forem confirmados, esse dado fique salvo no banco de dados para evitar recobrança ou qualquer coisa do tipo para o cliente

Input:
Para pedidos de produtos de beleza:

- Temos dois formatos de caixa: 11,5cm x 6,5cm x 6,5cm que cabe até 2 potes de creme, e outro que é 21cm x 12,5cm x 12,5cm que cabe 4 potes de creme.
- A tara de um pote de creme é de 28g
- POST na API do SuperFrete para solicitar cotação de creme (https://superfrete.readme.io/reference/cotacao-de-frete):

```bash
curl --request POST \
     --url https://sandbox.superfrete.com/api/v0/calculator \
     --header 'User-Agent: Nome e versão da aplicação (email para contato técnico)' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "from": {
    "postal_code": "01153000"
  },
  "to": {
    "postal_code": 20020050
  },
  "services": "1,2,17",
  "options": {
    "own_hand": false,
    "receipt": false,
    "insurance_value": 0,
    "use_insurance_value": false
  },
  "package": {
    "height": 2,
    "width": 11,
    "length": 16,
    "weight": 0.3
  }
}
'
```

- POST para pedir etiqueta de frete: https://superfrete.readme.io/reference/adicionar-frete-carrinho
- POST para finalizar pedido e gerar etiqueta: https://superfrete.readme.io/reference/apiintegrationv1checkout
- Lista para impressão de etiqueta: https://superfrete.readme.io/reference/tag-link
- Cancelar pedido: https://superfrete.readme.io/reference/cancelar-pedido
- Listar etiquetas: https://superfrete.readme.io/reference/listar-etiquetas-na-superfrete

Requirements:
Crie no mínimo mais um subagent para validação de qualidade de código e de funcionalidades, verificando se está tudo logicamente correto
Após terminar a task, anotar o que foi feito no CLAUDE.md e de docs/API.md
Precisaremos criar uma model para a caixa no banco de dados, então crie isso no Prisma e crie um CRUD para poder configurar posteriormente via frontend. Cada modelo de caixa deve ter uma entrada no BD, e já temos dois modelos de caixa que eu defini acima, então adicione isso ao seed do Prisma para vir por padrão
