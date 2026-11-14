package br.slz.conecta.domain;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Ciclo de vida do Plano de Ação Pedagógica:
 * PLANEJADO → EM_ANDAMENTO → CONCLUIDO → REAVALIADO.
 * Revisões permitidas (sempre com justificativa): EM_ANDAMENTO → PLANEJADO (replanejar),
 * CONCLUIDO → EM_ANDAMENTO (retomar) e REAVALIADO → EM_ANDAMENTO (ajustar e retomar).
 */
public enum StatusPlano {
    PLANEJADO("Planejado"),
    EM_ANDAMENTO("Em andamento"),
    CONCLUIDO("Concluído"),
    REAVALIADO("Reavaliado");

    private final String rotulo;

    StatusPlano(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }

    private static final Map<StatusPlano, Set<StatusPlano>> AVANCO = Map.of(
            PLANEJADO, EnumSet.of(EM_ANDAMENTO),
            EM_ANDAMENTO, EnumSet.of(CONCLUIDO),
            CONCLUIDO, EnumSet.of(REAVALIADO),
            REAVALIADO, EnumSet.noneOf(StatusPlano.class));

    private static final Map<StatusPlano, Set<StatusPlano>> REVISAO = Map.of(
            PLANEJADO, EnumSet.noneOf(StatusPlano.class),
            EM_ANDAMENTO, EnumSet.of(PLANEJADO),
            CONCLUIDO, EnumSet.of(EM_ANDAMENTO),
            REAVALIADO, EnumSet.of(EM_ANDAMENTO));

    public boolean podeIrPara(StatusPlano destino) {
        return AVANCO.get(this).contains(destino) || REVISAO.get(this).contains(destino);
    }

    /** Retrocessos (revisões) exigem justificativa. */
    public boolean exigeJustificativa(StatusPlano destino) {
        return REVISAO.get(this).contains(destino);
    }

    /** A passagem para REAVALIADO só acontece pelo registro de reavaliação. */
    public static boolean exigeRegistroDeReavaliacao(StatusPlano destino) {
        return destino == REAVALIADO;
    }

    public boolean ativo() {
        return this == PLANEJADO || this == EM_ANDAMENTO;
    }
}
