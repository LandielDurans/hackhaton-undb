package br.slz.conecta.analise;

import br.slz.conecta.domain.CalculadoraIndicadores;

/** Fato analítico: resultado de um estudante, em uma avaliação, em uma habilidade (via mapeamento explícito). */
public record Fato(
        String avaliacaoId,
        String estudanteId,
        String turmaId,
        String escolaId,
        String territorioId,
        int anoEscolar,
        String componenteId,
        String habilidadeId,
        int acertos,
        int itens) implements CalculadoraIndicadores.Registro {
}
