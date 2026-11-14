package br.slz.conecta.domain;

public enum Prioridade {
    ALTA, MEDIA, BAIXA;

    public Prioridade reduzir() {
        return this == ALTA ? MEDIA : BAIXA;
    }
}
