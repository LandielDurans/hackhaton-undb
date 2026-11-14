package br.slz.conecta.recomendacao;

import br.slz.conecta.domain.CriteriosPedagogicos;
import br.slz.conecta.domain.Prioridade;
import br.slz.conecta.domain.Tendencia;

import java.util.ArrayList;
import java.util.List;

/**
 * Regras TRANSPARENTES de priorização. Cada fator soma ou subtrai pontos e é descrito
 * na justificativa exibida ao usuário. ALTA >= 3 pontos; MÉDIA = 2; BAIXA <= 1.
 */
public final class RegrasPrioridade {
    private static final java.util.Locale BR = java.util.Locale.forLanguageTag("pt-BR");
    private RegrasPrioridade() {}

    public record Resultado(Prioridade prioridade, int pontos, List<String> fatores) {
        public String justificativa() {
            return String.join("; ", fatores) + ".";
        }
    }

    /**
     * @param percentualAtual        percentual de acerto na avaliação de referência
     * @param percentualAnterior     percentual na avaliação comparável anterior (pode ser nulo)
     * @param abrangenciaAlta        para recortes coletivos: a dificuldade aparece em ao menos 2/3 das unidades (escolas/turmas)
     * @param temPlanoAtivo          já existe plano planejado/em andamento cobrindo a habilidade no recorte
     */
    public static Resultado avaliar(CriteriosPedagogicos c, double percentualAtual, Double percentualAnterior,
                                    boolean abrangenciaAlta, boolean temPlanoAtivo) {
        int pts = 0;
        List<String> f = new ArrayList<>();
        double muitoBaixo = c.atencao() - 10;
        if (percentualAtual < muitoBaixo) {
            pts += 2;
            f.add(String.format(BR, "resultado muito abaixo do limiar de atenção (%.1f%% < %.0f%%) [+2]", percentualAtual, muitoBaixo));
        } else if (percentualAtual < c.atencao()) {
            pts += 1;
            f.add(String.format(BR, "resultado abaixo do limiar de atenção (%.1f%% < %.0f%%) [+1]", percentualAtual, c.atencao()));
        } else {
            f.add(String.format(BR, "resultado entre os limiares de atenção e adequado (%.1f%%) [0]", percentualAtual));
        }
        if (percentualAnterior != null && percentualAnterior < c.atencao()) {
            pts += 1;
            f.add(String.format(BR, "dificuldade recorrente: também abaixo do limiar na avaliação anterior (%.1f%%) [+1]", percentualAnterior));
        }
        Tendencia t = c.tendencia(percentualAnterior, percentualAtual);
        if (t == Tendencia.QUEDA) {
            pts += 1;
            f.add(String.format(BR, "queda em relação à avaliação comparável anterior (%.1f p.p.) [+1]", percentualAtual - percentualAnterior));
        } else if (t == Tendencia.MELHORA) {
            pts -= 1;
            f.add(String.format(BR, "melhora em relação à avaliação anterior (+%.1f p.p.) [-1]", percentualAtual - percentualAnterior));
        }
        if (abrangenciaAlta) {
            pts += 1;
            f.add("dificuldade presente na maioria das unidades do recorte [+1]");
        }
        if (temPlanoAtivo) {
            pts -= 1;
            f.add("já existe plano ativo cobrindo esta habilidade [-1]");
        }
        Prioridade p = pts >= 3 ? Prioridade.ALTA : pts == 2 ? Prioridade.MEDIA : Prioridade.BAIXA;
        return new Resultado(p, pts, f);
    }
}
