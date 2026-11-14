package br.slz.conecta.domain;

public enum DecisaoReavaliacao {
    FUNCIONOU("A estratégia funcionou"),
    AJUSTAR("Precisa de ajustes"),
    SUBSTITUIR("Deve ser substituída");

    private final String rotulo;

    DecisaoReavaliacao(String rotulo) {
        this.rotulo = rotulo;
    }

    public String rotulo() {
        return rotulo;
    }
}
