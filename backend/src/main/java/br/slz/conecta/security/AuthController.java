package br.slz.conecta.security;

import br.slz.conecta.auditoria.AuditoriaService;
import br.slz.conecta.common.ApiException;
import br.slz.conecta.common.ConectaProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final ConectaProperties props;
    private final AuditoriaService auditoria;

    public AuthController(UsuarioRepository usuarios, PasswordEncoder encoder, JwtService jwt,
                          ConectaProperties props, AuditoriaService auditoria) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.jwt = jwt;
        this.props = props;
        this.auditoria = auditoria;
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String senha) {}

    public record LoginResponse(Usuario usuario, String token) {}

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        var cred = usuarios.credencialPorEmail(req.email().trim())
                .filter(c -> encoder.matches(req.senha(), c.senhaHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos."));
        Usuario u = cred.usuario();
        String token = jwt.emitir(u);
        auditoria.registrar(u, "LOGIN", "SESSAO", u.id(), true, null);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(token, jwt.validade()).toString())
                .body(new LoginResponse(u, token));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString()).build();
    }

    @GetMapping("/me")
    public Usuario me() {
        return UsuarioAtual.get();
    }

    /**
     * Perfis de demonstração exibidos na tela de entrada. Só é exposto quando a carga
     * demonstrativa está ativa; não revela senhas além da senha de demonstração configurada.
     */
    @GetMapping("/perfis-demo")
    public Map<String, Object> perfisDemo() {
        if (!props.demo().seed()) return Map.of("perfis", List.of());
        return Map.of("perfis", usuarios.perfisDestaque(), "senha", props.demo().senha());
    }

    private ResponseCookie cookie(String valor, Duration maxAge) {
        return ResponseCookie.from(JwtAuthFilter.COOKIE, valor)
                .httpOnly(true)
                .secure(props.jwt().cookieSecure())
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
