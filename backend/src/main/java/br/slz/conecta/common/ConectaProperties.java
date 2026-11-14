package br.slz.conecta.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.LocalDate;

@ConfigurationProperties(prefix = "conecta")
public record ConectaProperties(Jwt jwt, Demo demo, Criterios criterios, Privacidade privacidade) {

    public record Jwt(String secret, int validadeHoras, boolean cookieSecure) {}

    public record Demo(boolean seed, String senha, LocalDate dataReferencia) {}

    /** Critérios pedagógicos configuráveis (percentuais de acerto). */
    public record Criterios(double adequado, double atencao, double variacaoRelevante) {}

    public record Privacidade(int minimoAgregacao) {}
}
