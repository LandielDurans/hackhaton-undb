package br.slz.conecta.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class RestExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(RestExceptionHandler.class);

    public static Map<String, Object> corpo(HttpStatus status, String mensagem) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", status.value());
        m.put("erro", status.getReasonPhrase());
        m.put("mensagem", mensagem);
        return m;
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> api(ApiException e) {
        return ResponseEntity.status(e.status()).body(corpo(e.status(), e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validacao(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.unprocessableEntity().body(corpo(HttpStatus.UNPROCESSABLE_ENTITY, "Dados inválidos — " + msg));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, Object>> leitura(Exception e) {
        return ResponseEntity.badRequest().body(corpo(HttpStatus.BAD_REQUEST, "Requisição malformada."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> negado(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(corpo(HttpStatus.FORBIDDEN, "Acesso não autorizado para este perfil."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> semRota(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(corpo(HttpStatus.NOT_FOUND, "Rota não encontrada."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> geral(Exception e) {
        log.error("Erro não tratado", e);
        return ResponseEntity.internalServerError().body(corpo(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno ao processar a solicitação."));
    }
}
