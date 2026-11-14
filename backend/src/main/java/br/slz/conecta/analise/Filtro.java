package br.slz.conecta.analise;

import java.util.function.Predicate;

/** Filtro analítico. Campos nulos não restringem. */
public record Filtro(
        String territorioId,
        String escolaId,
        String turmaId,
        Integer anoEscolar,
        String componenteId,
        String habilidadeId,
        String estudanteId) implements Predicate<Fato> {

    public static Filtro vazio() {
        return new Filtro(null, null, null, null, null, null, null);
    }

    public static Filtro de(String territorioId, String escolaId, Integer ano, String componenteId, String habilidadeId) {
        return new Filtro(blank(territorioId), blank(escolaId), null, ano, blank(componenteId), blank(habilidadeId), null);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    public Filtro comTerritorio(String id) { return new Filtro(id, escolaId, turmaId, anoEscolar, componenteId, habilidadeId, estudanteId); }
    public Filtro comEscola(String id) { return new Filtro(territorioId, id, turmaId, anoEscolar, componenteId, habilidadeId, estudanteId); }
    public Filtro comTurma(String id) { return new Filtro(territorioId, escolaId, id, anoEscolar, componenteId, habilidadeId, estudanteId); }
    public Filtro comAno(Integer ano) { return new Filtro(territorioId, escolaId, turmaId, ano, componenteId, habilidadeId, estudanteId); }
    public Filtro comComponente(String id) { return new Filtro(territorioId, escolaId, turmaId, anoEscolar, id, habilidadeId, estudanteId); }
    public Filtro comHabilidade(String id) { return new Filtro(territorioId, escolaId, turmaId, anoEscolar, componenteId, id, estudanteId); }
    public Filtro comEstudante(String id) { return new Filtro(territorioId, escolaId, turmaId, anoEscolar, componenteId, habilidadeId, id); }

    @Override
    public boolean test(Fato f) {
        return (territorioId == null || territorioId.equals(f.territorioId()))
                && (escolaId == null || escolaId.equals(f.escolaId()))
                && (turmaId == null || turmaId.equals(f.turmaId()))
                && (anoEscolar == null || anoEscolar == f.anoEscolar())
                && (componenteId == null || componenteId.equals(f.componenteId()))
                && (habilidadeId == null || habilidadeId.equals(f.habilidadeId()))
                && (estudanteId == null || estudanteId.equals(f.estudanteId()));
    }
}
