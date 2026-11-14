package br.slz.conecta.analise;

import java.time.LocalDate;

/** Registros de referência (catálogo) usados pelas análises. */
public final class Refs {
    private Refs() {}

    public record TerritorioRef(String id, String nome, String descricao, String bairros) {}

    public record EscolaRef(String id, String nome, String territorioId, String bairro, double lat, double lng, String etapas) {}

    public record TurmaRef(String id, String escolaId, int anoEscolar, String nome, String turno, int matriculados) {}

    public record ComponenteRef(String id, String nome) {}

    public record HabilidadeRef(String id, String componenteId, int anoEscolar, String anosBncc, String descricao,
                                String unidadeTematica, String grupo, String fonte) {}

    public record AvaliacaoRef(String id, String sigla, String nome, String tipo, LocalDate data, String grupoComparabilidade) {}

    public record ProfessorRef(String id, String nome, String escolaId) {}

    public record Vinculo(String professorId, String turmaId, String componenteId) {}
}
