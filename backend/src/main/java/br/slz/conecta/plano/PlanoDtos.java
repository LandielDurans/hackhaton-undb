package br.slz.conecta.plano;

import br.slz.conecta.domain.DecisaoReavaliacao;
import br.slz.conecta.domain.EscopoPlano;
import br.slz.conecta.domain.StatusPlano;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class PlanoDtos {
    private PlanoDtos() {}

    public record Ref(String id, String nome) {}

    public record PlanoResumo(
            long id, EscopoPlano escopo, String titulo, StatusPlano status,
            Ref territorio, Ref escola, Ref turma, Ref estudante,
            String componenteId, List<String> habilidades, String responsavel,
            LocalDate dataInicio, LocalDate prazo, boolean atrasado,
            Long planoPaiId, int acoesTotal, int acoesConcluidas, DecisaoReavaliacao decisaoReavaliacao,
            LocalDateTime atualizadoEm) {}

    public record Acao(long id, String descricao, String responsavel, LocalDate dataPrevista, String status, LocalDate concluidaEm) {}

    public record Registro(long id, String tipo, LocalDate data, String descricao, String percepcao, String autor, LocalDateTime criadoEm) {}

    public record Historico(long id, LocalDateTime dataHora, String usuario, String tipo, StatusPlano statusDe,
                            StatusPlano statusPara, String justificativa, String alteracoes) {}

    public record PlanoDetalhe(
            long id, EscopoPlano escopo, Ref territorio, Ref escola, Ref turma, Ref estudante,
            String componenteId, String titulo, String problema, String evidencias, String objetivo,
            String publicoAlvo, String estrategia, String estrategiaId, Ref formacao, String responsavel,
            LocalDate dataInicio, LocalDate prazo, String indicadorAcompanhamento, String criterioConclusao,
            String resultadoEsperado, StatusPlano status, String resultadoObservado, DecisaoReavaliacao decisaoReavaliacao,
            String avaliacaoBaseId, String recomendacaoChave, String criadoPor, LocalDateTime criadoEm,
            LocalDateTime atualizadoEm, int versao, List<String> habilidades, boolean atrasado, boolean podeEditar,
            List<StatusPlano> proximosStatus,
            PlanoResumo planoPai, List<PlanoResumo> planosVinculados, int planosVinculadosOcultos,
            List<Acao> acoes, List<Registro> registros, List<Historico> historico) {}

    public record AcaoInput(@NotBlank @Size(max = 600) String descricao,
                            @NotBlank @Size(max = 160) String responsavel,
                            @NotNull LocalDate dataPrevista) {}

    public record PlanoInput(
            @NotNull EscopoPlano escopo,
            String territorioId, String escolaId, String turmaId, String estudanteId,
            Long planoPaiId,
            @NotBlank String componenteId,
            @NotBlank @Size(max = 200) String titulo,
            @NotBlank @Size(max = 1500) String problema,
            @NotBlank @Size(max = 2000) String evidencias,
            @NotBlank @Size(max = 1000) String objetivo,
            @NotBlank @Size(max = 300) String publicoAlvo,
            @NotBlank @Size(max = 2000) String estrategia,
            String estrategiaId, String formacaoId,
            @NotBlank @Size(max = 160) String responsavel,
            @NotNull LocalDate dataInicio,
            @NotNull LocalDate prazo,
            @NotBlank @Size(max = 600) String indicadorAcompanhamento,
            @NotBlank @Size(max = 600) String criterioConclusao,
            @NotBlank @Size(max = 600) String resultadoEsperado,
            @NotEmpty List<String> habilidades,
            String avaliacaoBaseId,
            @Size(max = 160) String recomendacaoChave,
            List<@Valid AcaoInput> acoes,
            /* Obrigatória ao editar um plano que já saiu de PLANEJADO */
            @Size(max = 1000) String justificativa,
            /* Controle de concorrência otimista na edição */
            Integer versao) {}

    public record StatusInput(@NotNull StatusPlano status, @Size(max = 1000) String justificativa) {}

    public record AcaoStatusInput(@NotBlank @Pattern(regexp = "PENDENTE|EM_ANDAMENTO|CONCLUIDA") String status) {}

    public record RegistroInput(@NotBlank @Pattern(regexp = "EXECUCAO|ACOMPANHAMENTO") String tipo,
                                @NotNull LocalDate data,
                                @NotBlank @Size(max = 1500) String descricao,
                                @Pattern(regexp = "AVANCO|ESTAVEL|DIFICULDADE") String percepcao) {}

    public record ReavaliacaoInput(@NotBlank @Size(max = 1500) String resultadoObservado,
                                   @NotNull DecisaoReavaliacao decisao,
                                   @Size(max = 1000) String justificativa) {}
}
