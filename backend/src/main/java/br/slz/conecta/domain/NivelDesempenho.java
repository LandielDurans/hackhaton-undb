package br.slz.conecta.domain;

/**
 * Faixa de desempenho de UM resultado em UMA avaliação. Não é um rótulo do
 * estudante: descreve a evidência observada naquele momento.
 */
public enum NivelDesempenho {
    ADEQUADO("Adequado"),
    EM_DESENVOLVIMENTO("Em desenvolvimento"),
    REQUER_ATENCAO("Requer atenção");

    private final String rotulo;

    NivelDesempenho(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}
