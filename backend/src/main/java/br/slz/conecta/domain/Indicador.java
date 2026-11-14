package br.slz.conecta.domain;

/**
 * Indicador agregado calculado a partir de resultados individuais.
 *
 * @param estudantes        nº de estudantes distintos com resultado
 * @param percentualAcerto  soma de acertos / soma de itens (0–100); nulo se suprimido
 * @param percentualAdequado % de estudantes cujo resultado individual está na faixa adequada; nulo se suprimido
 * @param adequados/emDesenvolvimento/requerAtencao distribuição de estudantes por faixa (nulos se suprimido)
 * @param suprimido         verdadeiro quando o grupo é pequeno demais para ser exibido com segurança
 */
public record Indicador(
        int estudantes,
        Double percentualAcerto,
        Double percentualAdequado,
        Integer adequados,
        Integer emDesenvolvimento,
        Integer requerAtencao,
        NivelDesempenho nivel,
        boolean suprimido) {

    public static Indicador vazio() {
        return new Indicador(0, null, null, null, null, null, null, false);
    }

    public boolean temValor() {
        return !suprimido && percentualAcerto != null;
    }
}
