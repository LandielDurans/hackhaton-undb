package br.slz.conecta.plano;

import br.slz.conecta.domain.DecisaoReavaliacao;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.StatusPlano;
import br.slz.conecta.security.AccessPolicy;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Linha da tabela plano. */
public record PlanoRow(
        long id, EscopoPlano escopo, String territorioId, String escolaId, String turmaId, String estudanteId,
        Long planoPaiId, String componenteId, String titulo, String problema, String evidencias, String objetivo,
        String publicoAlvo, String estrategia, String estrategiaId, String formacaoId, String responsavel,
        LocalDate dataInicio, LocalDate prazo, String indicadorAcompanhamento, String criterioConclusao,
        String resultadoEsperado, StatusPlano status, String resultadoObservado, DecisaoReavaliacao decisaoReavaliacao,
        String avaliacaoBaseId, String recomendacaoChave, String criadoPor, LocalDateTime criadoEm,
        LocalDateTime atualizadoEm, int versao) {

    public AccessPolicy.AlvoPlano alvo() {
        return new AccessPolicy.AlvoPlano(escopo, territorioId, escolaId, turmaId, estudanteId);
    }
}
