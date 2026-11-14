package br.slz.conecta.security;

import br.slz.conecta.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class UsuarioAtual {
    private UsuarioAtual() {}

    public static Usuario get() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.getPrincipal() instanceof Usuario u) return u;
        throw new ApiException(HttpStatus.UNAUTHORIZED, "Autenticação necessária.");
    }
}
