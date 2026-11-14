package br.slz.conecta.curriculo;

import br.slz.conecta.analise.AnaliseService;
import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.Refs.*;
import br.slz.conecta.common.ConectaProperties;
import br.slz.conecta.common.Datas;
import br.slz.conecta.recomendacao.EstrategiaRepository;
import br.slz.conecta.security.Usuario;
import br.slz.conecta.security.UsuarioAtual;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api")
public class MetaController {
    private final Catalogo catalogo;
    private final AnaliseService analise;
    private final ConectaProperties props;
    private final Datas datas;
    private final JdbcTemplate jdbc;
    private final EstrategiaRepository estrategias;

    public MetaController(Catalogo catalogo, AnaliseService analise, ConectaProperties props, Datas datas, JdbcTemplate jdbc,
                          EstrategiaRepository estrategias) {
        this.catalogo = catalogo;
        this.analise = analise;
        this.props = props;
        this.datas = datas;
        this.jdbc = jdbc;
        this.estrategias = estrategias;
    }

    public record Meta(Collection<TerritorioRef> territorios, Collection<EscolaRef> escolas, List<Integer> anos,
                       Collection<ComponenteRef> componentes, Collection<HabilidadeRef> habilidades, List<AvaliacaoRef> avaliacoes,
                       Map<String, Object> criterios, int minimoAgregacao, String dataReferencia, List<TurmaRef> minhasTurmas,
                       String aviso) {}

    /** Metadados para filtros e legendas. Escolas e territórios são de uso agregado; turmas, apenas as do escopo do usuário. */
    @GetMapping("/meta")
    public Meta meta() {
        Usuario u = UsuarioAtual.get();
        var c = analise.criterios();
        List<TurmaRef> minhas = switch (u.papel()) {
            case GESTOR_REDE -> List.of();
            case COORDENADOR -> catalogo.turmasDaEscola(u.escolaId());
            case PROFESSOR -> catalogo.turmasDoProfessor(u.professorId()).stream().map(catalogo::turma).toList();
        };
        return new Meta(catalogo.territorios(), catalogo.escolas(),
                catalogo.turmas().stream().map(TurmaRef::anoEscolar).distinct().sorted().toList(),
                catalogo.componentes(), catalogo.habilidades(), catalogo.avaliacoesRede(),
                Map.of("adequado", c.adequado(), "atencao", c.atencao(), "variacaoRelevante", c.variacaoRelevante()),
                props.privacidade().minimoAgregacao(), datas.hoje().toString(), minhas,
                "Dados DEMONSTRATIVOS e FICTÍCIOS. Não há integração com sistemas da SEMED ou com o SIMAE.");
    }

    public record DescritorMap(String id, String descricao, String matriz, String statusValidacao, String observacao) {}

    public record HabilidadeCurriculo(HabilidadeRef habilidade, List<DescritorMap> descritores,
                                      List<Map<String, String>> estrategias, List<Map<String, String>> formacoes) {}

    /** Matriz curricular: ano → componente → habilidade → descritores mapeados (com status de validação). */
    @GetMapping("/curriculo")
    public Map<String, Object> curriculo(@RequestParam(required = false) Integer ano, @RequestParam(required = false) String componenteId) {
        Map<String, List<DescritorMap>> desc = new HashMap<>();
        jdbc.query("""
                SELECT dh.habilidade_id, d.id, d.descricao, d.matriz, dh.status_validacao, dh.observacao
                  FROM descritor_habilidade dh JOIN descritor d ON d.id = dh.descritor_id ORDER BY d.id""", rs -> {
            desc.computeIfAbsent(rs.getString(1), k -> new ArrayList<>())
                    .add(new DescritorMap(rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6)));
        });
        Map<String, List<Map<String, String>>> forms = new HashMap<>();
        jdbc.query("SELECT fh.habilidade_id, f.id, f.titulo, f.status FROM formacao_habilidade fh JOIN formacao f ON f.id = fh.formacao_id", rs -> {
            forms.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(Map.of("id", rs.getString(2), "titulo", rs.getString(3), "status", rs.getString(4)));
        });
        String comp = componenteId == null || componenteId.isBlank() ? null : componenteId;
        List<HabilidadeCurriculo> habs = catalogo.habilidadesDe(ano, comp).stream().map(h -> new HabilidadeCurriculo(h,
                desc.getOrDefault(h.id(), List.of()),
                estrategias.paraHabilidade(h.id()).stream().map(e -> Map.of("id", e.id(), "titulo", e.titulo(), "tipo", e.tipo())).toList(),
                forms.getOrDefault(h.id(), List.of()))).toList();
        return Map.of("habilidades", habs,
                "fonte", "Códigos e textos das habilidades: Base Nacional Comum Curricular (MEC, 2018). O alinhamento com a "
                        + "Proposta Curricular da Rede Municipal de São Luís não foi verificado nesta demonstração.",
                "aviso", "Os descritores das avaliações são DEMONSTRATIVOS e não são tratados como equivalentes às habilidades: "
                        + "cada vínculo descritor → habilidade é um mapeamento explícito, com status de validação.");
    }

    @GetMapping("/estrategias")
    public List<EstrategiaRepository.Estrategia> estrategias(@RequestParam(required = false) String habilidadeId) {
        return habilidadeId == null || habilidadeId.isBlank() ? estrategias.todas() : estrategias.paraHabilidade(habilidadeId);
    }
}
