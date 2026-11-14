package br.slz.conecta.domain;

/**
 * Critérios pedagógicos configuráveis. Os limiares são percentuais de acerto (0–100).
 */
public record CriteriosPedagogicos(double adequado, double atencao, double variacaoRelevante) {

    public CriteriosPedagogicos {
        if (atencao <= 0 || adequado <= atencao || adequado > 100) {
            throw new IllegalArgumentException("Critérios inválidos: é preciso 0 < atenção < adequado <= 100");
        }
        if (variacaoRelevante < 0) {
            throw new IllegalArgumentException("Variação relevante deve ser >= 0");
        }
    }

    public NivelDesempenho classificar(double percentual) {
        if (percentual >= adequado) return NivelDesempenho.ADEQUADO;
        if (percentual >= atencao) return NivelDesempenho.EM_DESENVOLVIMENTO;
        return NivelDesempenho.REQUER_ATENCAO;
    }

    public Tendencia tendencia(Double anterior, Double atual) {
        if (anterior == null || atual == null) return Tendencia.SEM_COMPARACAO;
        double delta = atual - anterior;
        if (delta >= variacaoRelevante) return Tendencia.MELHORA;
        if (delta <= -variacaoRelevante) return Tendencia.QUEDA;
        return Tendencia.ESTAVEL;
    }
}
