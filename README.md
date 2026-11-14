# Conecta Educação SLZ

**Inteligência territorial, diagnóstico educacional e planejamento pedagógico para a rede municipal de São Luís.**
Projeto para o Hackathon São Luís do Futuro — Desafio 6 (SEMED): *Integração e Acompanhamento da Gestão Pedagógica*.

> A SEMED identifica onde existem desafios, a escola compreende o que precisa melhorar e o professor recebe apoio para
> decidir como agir. O Conecta Educação SLZ conecta essas decisões e acompanha seus resultados.

⚠️ **Demonstração com dados fictícios.** Escolas, professores, estudantes e resultados são gerados de forma determinística.
Não há acesso a dados reais da SEMED nem integração com o SIMAE.

## Design e identidade visual

🎨 **Figma:** [Conecta Educação São Luís · Identidade Visual](https://www.figma.com/design/pyPbkBl0mza6dTwONBSfaR)

- **00 · Identidade & Apresentação** — apresentação da marca (conceito, símbolo, cores, tipografia, aplicações).
- **01 · Tokens & Componentes** — variáveis de cor e estilos de texto usados no front-end (`frontend/src/app/globals.css`).
- **02 · Protótipo (telas)** — 9 telas de referência da jornada da demo, navegáveis no modo apresentação.

Identidade baseada na marca e no site da Prefeitura de São Luís: Azul São Luís `#2071B7`, Azul Profundo `#0D2B4A`,
Azul Azulejo `#39A6DE`, Verde Babaçu `#A8C048`, Amarelo Sol `#F2C230` e Telha `#D9573F`; fontes Poppins (títulos) e Inter
(interface); fotos reais da cidade (Wikimedia Commons, licenças livres).

---

## Executar

### Com Docker (recomendado)

```bash
cp .env.example .env          # defina JWT_SECRET (mínimo 32 caracteres)
docker compose up --build
```

- Aplicação: <http://localhost:3300>
- API (somente localhost): <http://localhost:8088/actuator/health>

O banco PostgreSQL é criado pelas migrações (Flyway) e a carga demonstrativa é gerada na primeira subida (~5 s).
Para recomeçar do zero: `docker compose down -v`.

As portas podem ser alteradas no `.env` (`WEB_PORT`, `API_PORT`).

### Sem Docker (desenvolvimento)

Requisitos: Java 21, Maven, Node 20+.

```bash
# API com banco H2 em memória (mesmas migrações, modo PostgreSQL)
cd backend && mvn -DskipTests package
PORT=8088 SPRING_PROFILES_ACTIVE=local java -jar target/conecta-api.jar

# Front-end (em outro terminal)
cd frontend && npm ci
API_URL=http://localhost:8088 npm run dev     # http://localhost:3300
```

### Testes

```bash
cd backend && mvn test        # 27 testes: indicadores, ciclo do plano, priorização, permissões, consistência entre níveis
cd frontend && npm test && npm run typecheck
```

---

## Perfis de demonstração

Senha de todos: `demo123` (configurável). A tela de entrada lista os perfis; o menu do usuário permite **trocar de perfil** sem sair.

| Perfil | E-mail | O que vê |
|---|---|---|
| Gestão da rede (SEMED) | `semed@conecta.demo` | Toda a rede, **somente agregados**. Sem acesso a estudantes. Trilha de auditoria. |
| Coordenação — EM Mangue Vivo | `coordenacao.manguevivo@conecta.demo` | A própria escola, inclusive dados individuais. |
| Professora — 5º ano A, EM Mangue Vivo | `professora.helena@conecta.demo` | Apenas suas turmas e seus estudantes. |
| Coordenação — EM Babaçu | `coordenacao.babacu@conecta.demo` | A própria escola. |
| Professor — 5º ano A, EM Babaçu | `professor.paulo@conecta.demo` | Útil para mostrar acesso negado à turma de outra escola. |

---

## Roteiro de demonstração (≈ 7 minutos)

1. **Gestão regional** — entre como *Rosângela (SEMED)*. O **Mapa da rede** segue o esboço da equipe: cinco análises no topo
   (Evasão, Desempenho por notas, Desempenho por matéria, Escassez de professores, Educação especial), seletores de escola, ano e
   matéria, o mapa ilustrado da ilha (cartografia do OpenStreetMap redesenhada no traço do esboço: avenidas em hierarquia com nomes,
   rios Anil e Bacanga, Lagoa da Jansen, mangues em zigue-zague, parques, praias, pista do aeroporto, rodoviária, rosa dos ventos e
   escala) com escolas em cubos e focos de calor vermelho/amarelo/azul/verde, e o painel **NOTIFICAÇÕES** ("Escola do Centro está com 32% de evasão!", "A escola do Turu
   precisa de profissionais!", "O desempenho dos alunos no Bequimão está abaixo da média."). Clique numa notificação para focar a escola.
2. **Escola** — clique na *EM Mangue Vivo* (Anjo da Guarda) → *Abrir diagnóstico*. Veja turmas, habilidades mais baixas, plano
   escolar vinculado ao plano territorial e recomendações (“Turmas do 5º ano com dificuldade em frações”).
3. **Turma** — *5º ano A → Analisar*. A matriz mostra habilidade → descritor → AV1/AV2/AV3 → situação → apoio disponível.
   Na aba **Estudantes**, a SEMED vê o aviso de restrição (LGPD).
4. **Trocar perfil** para *Helena (professora)*. Em **Minhas turmas → 5º ano A → Estudantes**, abra *Davi S.*
5. **Perfil individual** — resumo “precisa de apoio em / avançando em / vai bem em”, habilidades, evolução e intervenção anterior.
6. **O que fazer** — a primeira sugestão (Frações, EF05MA03) já vem aberta: “Experimente” com passos curtos, material,
   como acompanhar e quando reavaliar; evidências ficam em “Por que essa sugestão?”. Clique em **Usar no meu plano**.
7. **Planejamento** — o plano abre em modo rápido (4 campos, o resto já preenchido); ajuste e **Criar plano**. Depois **Iniciar execução** e registre uma atividade.
8. **Reavaliação** — **Registrar reavaliação** no perfil do estudante (reavaliação direcionada, exibida separada das avaliações
   comparáveis); no plano, **Concluir** → **Registrar reavaliação** com a decisão (funcionou / ajustar / substituir).
9. **Visão estratégica** — volte para a SEMED: **Acompanhamento** mostra contagens por escopo (planos individuais só como números),
   prazos vencidos e resultados antes/depois; **Auditoria** mostra os acessos individuais e a tentativa negada.

---

## Arquitetura

```
frontend/   Next.js 15 (App Router) · identidade visual com as cores da Prefeitura de São Luís · TypeScript · Tailwind CSS 4 · componentes no estilo shadcn/ui (Radix)
            TanStack Query · Recharts · Leaflet + OpenStreetMap
            /api/* é encaminhado ao back-end (mesmo domínio → cookie HttpOnly sem CORS)
backend/    Spring Boot 3.5 · Java 21 · JDBC + Flyway · Spring Security (JWT em cookie HttpOnly) · PostgreSQL 16
docker-compose.yml   db (Postgres) → api → web
```

Organização do back-end (`backend/src/main/java/br/slz/conecta`):

| Pacote | Responsabilidade |
|---|---|
| `domain` | Regras puras, sem framework: faixas de desempenho, cálculo de indicadores e supressão, ciclo de vida do plano, tendência. |
| `analise` | Catálogo de referência e fatos analíticos (resultado × habilidade via mapeamento explícito); todos os agregados derivam daqui. |
| `rede`, `escola`, `estudante` | Os três níveis: mapa/painel regional, diagnóstico escolar e de turma, perfil individual. |
| `recomendacao` | Motor de regras explicáveis + priorização por pontos (`RegrasPrioridade`) + validação humana (aceitar/descartar). |
| `plano` | Plano de Ação Pedagógica: escopos, validações, transições, ações, registros, histórico, evidência antes/depois. |
| `formacao` | Catálogo, demandas calculadas a partir dos diagnósticos, participações e aplicação. |
| `security`, `auditoria` | Autenticação, `AccessPolicy` (papel × escopo), trilha de auditoria. |
| `seed` | Gerador determinístico dos dados demonstrativos. |

### Modelo de dados (principais tabelas)

`territorio` → `escola` → `turma` → `estudante`; `professor` ↔ `turma` (por componente); `habilidade` (BNCC) ← `descritor_habilidade`
(mapeamento explícito, com status de validação) → `descritor`; `avaliacao` (com grupo de comparabilidade) → `resultado`
(estudante × descritor × turma no momento da aplicação); `plano` (escopo território/escola/turma/estudante, plano pai) →
`plano_habilidade`, `plano_acao`, `plano_registro`, `plano_historico`; `estrategia` ↔ `habilidade`; `formacao` ↔ `habilidade`,
`participacao`; `recomendacao_decisao`; `usuario`; `auditoria`. Esquema em `backend/src/main/resources/db/migration`.

### Regras centrais

- **Indicadores**: % de acerto = Σ acertos ÷ Σ itens dos registros individuais do recorte; cada estudante é classificado pelo próprio
  percentual. Faixas configuráveis (`CRITERIO_ADEQUADO=70`, `CRITERIO_ATENCAO=50`). Os mesmos registros alimentam mapa, escola,
  turma e estudante — os números coincidem entre os níveis (há teste para isso).
- **Comparabilidade**: só se comparam avaliações do mesmo grupo (mesma matriz). Reavaliações direcionadas do professor são outro
  instrumento e aparecem separadas.
- **Privacidade**: grupos com menos de 5 estudantes têm valores suprimidos (`PRIVACIDADE_MINIMO`).
- **Permissões no back-end**: SEMED só agregados (403 em dados individuais e planos individuais); coordenação limitada à escola;
  professor limitado às suas turmas. Acessos individuais, alterações e negativas vão para a auditoria.
- **Plano**: `PLANEJADO → EM_ANDAMENTO → CONCLUIDO → REAVALIADO`; revisões (voltar a planejado, retomar, ajustar após
  reavaliação) exigem justificativa; edição de plano em execução exige justificativa; controle de versão otimista (409);
  habilidades precisam corresponder ao componente e ao ano da turma; reavaliação só após conclusão.
- **Recomendações**: regras explícitas (dificuldade recorrente, identificada, queda, padrão entre turmas/escolas). Prioridade por
  pontos com justificativa exibida. Nenhuma obrigação é criada: o usuário aceita (gera plano) ou descarta com justificativa.
- **Evasão**: estudantes com situação `ABANDONO` ÷ estudantes das turmas acompanhadas; quem saiu não tem resultado após a data de saída.
- **Escassez de profissionais**: soma das vagas não preenchidas (necessários − lotados) no quadro da escola.
- **Educação especial**: apenas contagens agregadas por escola (nenhuma marcação individual); cobertura = atendidos ÷ público.
- **Notificações**: regras explícitas — evasão ≥ 15%, bairro ≥ 4 p.p. abaixo da média da rede, vagas abertas no quadro, cobertura de
  atendimento da educação especial < 70%.
- **Formação**: demanda = professor de turma com resultado abaixo do limiar na habilidade sem formação relacionada concluída ou em
  curso. Resultados de estudantes não avaliam professores.

### Sobre os dados demonstrativos

- 6 territórios (agrupamentos de bairros reais, **sem limites oficiais**), 18 escolas fictícias com coordenadas próximas aos
  bairros no OpenStreetMap, 53 turmas (2º, 5º e 9º anos), 1.219 estudantes, 3 avaliações comparáveis em 2026, 24 habilidades BNCC.
- Resultados gerados por um modelo logístico simples com dificuldades por habilidade e padrões por território (semente fixa).
  Textos de planos e reavaliações são escritos a partir dos números efetivamente gerados.
- Códigos e textos das habilidades seguem a BNCC (MEC, 2018); o alinhamento com a Proposta Curricular de São Luís **não** foi
  verificado. Descritores e mapeamentos são demonstrativos.

## Cartografia

As camadas do mapa ilustrado ficam em `frontend/public/geo/` (GeoJSON simplificado, baixado do OpenStreetMap via Overpass,
© colaboradores do OpenStreetMap, licença ODbL). Funcionam sem internet; o modo “Ruas” usa os tiles online do OpenStreetMap.

## Limitações conhecidas

- Sem inteligência artificial generativa: o motor de recomendações é baseado em regras (transparente e verificável).
- Poucos itens por habilidade em cada avaliação: resultados individuais por habilidade oscilam e devem ser lidos com cautela.
- Os mapas de fundo dependem do servidor de tiles do OpenStreetMap (conexão com a internet).
- Em produção: `COOKIE_SECURE=true` atrás de HTTPS, segredo JWT forte, gestão real de usuários e integração com as bases oficiais.
