package br.slz.conecta.recomendacao;

import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.common.ApiException;
import br.slz.conecta.security.AccessPolicy;
import br.slz.conecta.security.Usuario;
import br.slz.conecta.security.UsuarioAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recomendacoes")
public class RecomendacaoController {
    private final RecomendacaoService service;
    private final AccessPolicy acesso;
    private final Catalogo catalogo;
    private final DecisaoRepository decisoes;

    public RecomendacaoController(RecomendacaoService service, AccessPolicy acesso, Catalogo catalogo, DecisaoRepository decisoes) {
        this.service = service;
        this.acesso = acesso;
        this.catalogo = catalogo;
        this.decisoes = decisoes;
    }

    @GetMapping("/regionais")
    public List<RecomendacaoService.Recomendacao> regionais(@RequestParam(required = false) String territorioId,
                                                           @RequestParam(required = false) String componenteId,
                                                           @RequestParam(required = false) Integer ano,
                                                           @RequestParam(required = false) String avaliacaoId) {
        Usuario u = UsuarioAtual.get();
        String ter = blank(territorioId);
        if (!u.gestor()) ter = u.territorioId(); // escolas veem as recomendações do próprio território
        return service.regionais(ter, blank(componenteId), ano, blank(avaliacaoId));
    }

    @GetMapping("/escolas/{escolaId}")
    public List<RecomendacaoService.Recomendacao> escola(@PathVariable String escolaId,
                                                        @RequestParam(required = false) String componenteId,
                                                        @RequestParam(required = false) String avaliacaoId) {
        Usuario u = UsuarioAtual.get();
        acesso.exigirEscola(u, escolaId);
        var lista = service.escolares(escolaId, blank(componenteId), blank(avaliacaoId));
        if (u.professor()) {
            var minhas = catalogo.turmasDoProfessor(u.professorId());
            lista = lista.stream().filter(r -> r.alvo().turmaId() == null || minhas.contains(r.alvo().turmaId())).toList();
        }
        return lista;
    }

    @GetMapping("/turmas/{turmaId}")
    public List<RecomendacaoService.Recomendacao> turma(@PathVariable String turmaId,
                                                       @RequestParam(required = false) String componenteId,
                                                       @RequestParam(required = false) String avaliacaoId) {
        acesso.exigirTurma(UsuarioAtual.get(), turmaId);
        return service.daTurma(turmaId, blank(componenteId), blank(avaliacaoId));
    }

    @GetMapping("/estudantes/{estudanteId}")
    public List<RecomendacaoService.Recomendacao> estudante(@PathVariable String estudanteId,
                                                           @RequestParam(required = false) String componenteId) {
        var est = acesso.exigirEstudante(UsuarioAtual.get(), estudanteId, "VER_RECOMENDACOES");
        return service.individuais(estudanteId, est.turmaId(), blank(componenteId));
    }

    public record DecisaoInput(@NotBlank @Size(max = 160) String chave,
                               @NotBlank @Pattern(regexp = "DESCARTADA") String decisao,
                               @NotBlank @Size(max = 1000) String justificativa) {}

    /** Descartar uma recomendação exige justificativa (validação humana). Aceitar acontece ao criar um plano. */
    @PostMapping("/decisoes")
    public ResponseEntity<Void> decidir(@Valid @RequestBody DecisaoInput in) {
        Usuario u = UsuarioAtual.get();
        String[] p = in.chave().split(":");
        if (p.length < 3) throw ApiException.invalido("Chave de recomendação inválida.");
        switch (p[0]) {
            case "TER" -> { if (!u.gestor()) throw ApiException.proibido("Recomendações territoriais são decididas pela gestão da rede."); }
            case "ESC" -> acesso.exigirEscola(u, p[1]);
            case "TUR" -> acesso.exigirTurma(u, p[1]);
            case "EST" -> acesso.exigirEstudante(u, p[1], "DECIDIR_RECOMENDACAO");
            default -> throw ApiException.invalido("Chave de recomendação inválida.");
        }
        decisoes.registrar(in.chave(), in.decisao(), in.justificativa().trim(), null, u.id());
        return ResponseEntity.noContent().build();
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
