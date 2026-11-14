package br.slz.conecta.domain;

public enum EscopoPlano {
    TERRITORIO("Território"),
    ESCOLA("Escola"),
    TURMA("Turma"),
    ESTUDANTE("Estudante");

    private final String rotulo;

    EscopoPlano(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}
