"use client";
import { Database, Eye, Gauge, Lock, Scale, ShieldCheck, Workflow, TriangleAlert } from "lucide-react";
import { useMeta } from "@/lib/queries";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/states";
import { PageHeader } from "@/components/domain/kit";

export default function Page() {
  const meta = useMeta();
  if (meta.isLoading) return <PageLoading />;
  const c = meta.data!.criterios;
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Transparência" title="Metodologia, dados e limites"
        description="Como os números são calculados, como as recomendações são geradas e o que a plataforma não faz." />
      <div className="grid gap-5 md:grid-cols-2">
        <Bloco icon={<Database size={16} />} titulo="Dados desta demonstração">
          <li>Todos os dados são <strong>fictícios e demonstrativos</strong>: escolas, professores, estudantes e resultados foram gerados por um modelo determinístico (semente fixa), reproduzível a cada execução.</li>
          <li>As escolas estão em coordenadas demonstrativas próximas ao centro dos bairros no OpenStreetMap. Os territórios são <strong>agrupamentos de bairros sem limites oficiais</strong>; por isso não há mapas de calor nem polígonos.</li>
          <li>Não há acesso a dados reais da SEMED nem integração com o SIMAE.</li>
        </Bloco>
        <Bloco icon={<Gauge size={16} />} titulo="Como os indicadores são calculados">
          <li>Percentual de acerto = soma de acertos ÷ soma de itens dos registros individuais no recorte.</li>
          <li>Faixas: adequado ≥ {c.adequado}%, em desenvolvimento entre {c.atencao}% e {c.adequado}%, requer atenção &lt; {c.atencao}%. Critérios configuráveis.</li>
          <li>% de estudantes adequados: cada estudante é classificado pelo seu próprio percentual no recorte.</li>
          <li>Comparações só entre avaliações do mesmo grupo de comparabilidade (mesma matriz). Melhora ou queda exigem variação de ao menos {c.variacaoRelevante} p.p.</li>
          <li>Mapa, escola, turma e estudante usam os mesmos registros: os números são consistentes entre os níveis.</li>
        </Bloco>
        <Bloco icon={<Workflow size={16} />} titulo="Como as recomendações são geradas">
          <li>Motor de <strong>regras explícitas</strong> — não há inteligência artificial generativa nesta versão.</li>
          <li>Regras: dificuldade recorrente (abaixo do limiar em avaliações seguidas), dificuldade identificada, queda relevante e padrão entre turmas/escolas.</li>
          <li>Prioridade por pontos: resultado muito baixo (+2), abaixo do limiar (+1), recorrência (+1), queda (+1), abrangência (+1), melhora (−1) e plano ativo (−1). Alta ≥ 3, média = 2, baixa ≤ 1. A justificativa aparece em cada recomendação.</li>
          <li>Estratégias e formações vêm de catálogos cadastrados e vinculados a habilidades.</li>
          <li>Nenhuma recomendação cria obrigações: o profissional aceita (criando um plano) ou descarta com justificativa.</li>
        </Bloco>
        <Bloco icon={<Scale size={16} />} titulo="Currículo e avaliação">
          <li>Habilidades com códigos e textos da BNCC (MEC, 2018). O alinhamento com a Proposta Curricular de São Luís não foi verificado nesta demonstração.</li>
          <li>Descritores de avaliação não são tratados como equivalentes às habilidades: o vínculo é um mapeamento explícito com status de validação (aqui, “demonstrativo”).</li>
          <li>Resultados observados são distintos de hipóteses sobre causas, que devem ser investigadas pela equipe.</li>
        </Bloco>
        <Bloco icon={<Lock size={16} />} titulo="Privacidade e LGPD">
          <li>Permissões aplicadas no back-end: SEMED vê apenas agregados; coordenação, a própria escola; professor, apenas os estudantes das suas turmas.</li>
          <li>Grupos com menos de {meta.data!.minimoAgregacao} estudantes têm os valores suprimidos para evitar reidentificação.</li>
          <li>Minimização: estudantes identificados por nome abreviado fictício e código; sem data de nascimento, endereço ou dados sensíveis.</li>
          <li>Acessos a dados individuais, alterações e tentativas negadas são registrados em auditoria.</li>
          <li>Sessão em cookie HttpOnly (SameSite=Lax); senhas com BCrypt.</li>
        </Bloco>
        <Bloco icon={<Eye size={16} />} titulo="Uso responsável">
          <li>Faixas de desempenho descrevem resultados em avaliações específicas — não são rótulos do estudante.</li>
          <li>O sistema não faz diagnósticos clínicos nem infere capacidade intelectual, deficiência ou transtornos.</li>
          <li>Resultados dos estudantes não são usados para avaliar professores. A formação é tratada como apoio profissional.</li>
          <li>Não há ranking de escolas: a lista de escolas que podem precisar de apoio usa critérios explícitos e ordem alfabética.</li>
          <li>Comparações antes/depois indicam associação temporal, não causalidade.</li>
        </Bloco>
        <Bloco icon={<ShieldCheck size={16} />} titulo="Acessibilidade">
          <li>Objetivo: WCAG 2.2 AA. Cores das faixas validadas para daltonismo e sempre acompanhadas de rótulo ou ícone.</li>
          <li>Navegação por teclado, foco visível, link para pular ao conteúdo, textos alternativos nos gráficos e layout responsivo.</li>
        </Bloco>
        <Bloco icon={<TriangleAlert size={16} />} titulo="Limitações conhecidas">
          <li>Poucos itens por habilidade em cada avaliação: resultados individuais por habilidade são instáveis e devem ser lidos com cautela.</li>
          <li>Mapas de fundo dependem de conexão com os servidores de tiles do OpenStreetMap.</li>
          <li>Integrações reais (SIMAE, sistemas de matrícula) e validação curricular com a SEMED seriam próximos passos.</li>
        </Bloco>
      </div>
    </div>
  );
}

function Bloco({ icon, titulo, children }: { icon: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={titulo} icon={icon} />
      <CardBody><ul className="list-disc pl-5 space-y-1.5 text-[13.5px] text-ink-2 leading-relaxed">{children}</ul></CardBody>
    </Card>
  );
}
