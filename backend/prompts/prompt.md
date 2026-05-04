You are a senior software engineer working on backend development with Fastify.

Task:

agora vamos adicionar uma lógica de Cupons e Promoções. um administrador deve conseguir cadastrar um cupom, colocar a % de desconto, dar data de validade a ele, definir quantas vezes ele pode ser usado no total de clientes. nunca permitir um cliente usar o mesmo cupom mais de uma vez, determinar que um cupom seja segmentado para apenas um ou mais emails específicos, marcar se ele pode ser acumulado com um preço de promoção vigente, e também deve conseguir cancelar manualmente um cupom em vigência

quanto a promoções, ele deve conseguir cadastrar a promoção, determinar se é para todos os produtos ou apenas para uma categoria específica, a % é claro e a duração da promoção

Requirements:
Crie no mínimo mais um subagent para validação de qualidade de código e de funcionalidades, verificando se está tudo logicamente correto
Após terminar a task, anotar o que foi feito no docs/API.md
Precisaremos criar uma model para a caixa no banco de dados, então crie isso no Prisma e crie um CRUD para poder configurar posteriormente via frontend. Cada modelo de caixa deve ter uma entrada no BD, e já temos dois modelos de caixa que eu defini acima, então adicione isso ao seed do Prisma para vir por padrão
