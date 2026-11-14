package br.slz.conecta.auditoria;

import br.slz.conecta.common.ApiException;
import br.slz.conecta.security.Usuario;
import br.slz.conecta.security.UsuarioAtual;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auditoria")
public class AuditoriaController {
    private final AuditoriaService service;

    public AuditoriaController(AuditoriaService service) {
        this.service = service;
    }

    /** Trilha de auditoria — restrita à gestão da rede. Contém apenas identificadores, não dados pedagógicos. */
    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam(defaultValue = "100") int limite) {
        Usuario u = UsuarioAtual.get();
        if (!u.gestor()) throw ApiException.proibido("A trilha de auditoria é restrita à gestão da rede.");
        return service.recentes(Math.min(500, Math.max(1, limite)));
    }
}
