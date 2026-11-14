package br.slz.conecta.security;

public record Usuario(
        String id,
        String email,
        String nome,
        Papel papel,
        String cargo,
        String escolaId,
        String escolaNome,
        String territorioId,
        String professorId) {

    public boolean gestor() { return papel == Papel.GESTOR_REDE; }
    public boolean coordenador() { return papel == Papel.COORDENADOR; }
    public boolean professor() { return papel == Papel.PROFESSOR; }
}
