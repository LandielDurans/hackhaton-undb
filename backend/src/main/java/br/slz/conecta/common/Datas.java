package br.slz.conecta.common;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Fornece a data de referência da demonstração ("hoje"), configurável. */
@Component
public class Datas {
    private final ConectaProperties props;

    public Datas(ConectaProperties props) {
        this.props = props;
    }

    public LocalDate hoje() {
        LocalDate ref = props.demo() != null ? props.demo().dataReferencia() : null;
        return ref != null ? ref : LocalDate.now();
    }

    public LocalDateTime agora() {
        return LocalDateTime.of(hoje(), LocalTime.now().withNano(0));
    }
}
