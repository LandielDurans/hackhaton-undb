package br.slz.conecta.seed;

import br.slz.conecta.analise.Catalogo;
import br.slz.conecta.analise.FatoRepository;
import br.slz.conecta.common.ConectaProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Gera o conjunto de dados DEMONSTRATIVOS de forma DETERMINÍSTICA (semente fixa).
 *
 * <p>Os resultados individuais são gerados por um modelo simples de proficiência (logístico) com
 * dificuldades por habilidade e padrões por território. Todos os indicadores exibidos nas telas são
 * calculados a partir desses registros individuais — nenhum número agregado é inserido diretamente.</p>
 *
 * <p>Planos, reavaliações e decisões são escritos a partir dos números efetivamente gerados, para que
 * os textos sejam coerentes com os dados em todos os níveis.</p>
 */
@Component
@Order(10)
public class DemoSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoSeeder.class);
    private static final long SEMENTE = 20260314L;
    private static final String[] AVS = {"AV1-2026", "AV2-2026", "AV3-2026"};
    private static final LocalDate[] DATAS_AV = {LocalDate.of(2026, 3, 16), LocalDate.of(2026, 6, 15), LocalDate.of(2026, 9, 21)};
    private static final double[] CRESCIMENTO = {0.0, 0.15, 0.30};

    private final JdbcTemplate jdbc;
    private final ConectaProperties props;
    private final PasswordEncoder encoder;
    private final TransactionTemplate tx;
    private final Catalogo catalogo;
    private final FatoRepository fatos;

    public DemoSeeder(JdbcTemplate jdbc, ConectaProperties props, PasswordEncoder encoder, TransactionTemplate tx,
                      Catalogo catalogo, FatoRepository fatos) {
        this.jdbc = jdbc;
        this.props = props;
        this.encoder = encoder;
        this.tx = tx;
        this.catalogo = catalogo;
        this.fatos = fatos;
    }

    // ------------------------------------------------------------------ modelo

    private static final Map<String, Double> DIFICULDADE_GRUPO = Map.ofEntries(
            Map.entry("Sistema de numeração", -0.10), Map.entry("Cálculo e fatos básicos", -0.25),
            Map.entry("Resolução de problemas", 0.20), Map.entry("Alfabetização", 0.05),
            Map.entry("Compreensão leitora", -0.15), Map.entry("Frações", 0.35), Map.entry("Inferência", 0.30),
            Map.entry("Coesão textual", 0.20), Map.entry("Álgebra e funções", 0.45), Map.entry("Geometria", 0.40),
            Map.entry("Argumentação", 0.35));

    private static final Map<String, Double> BASE_TERRITORIO = Map.of(
            "TER-CEN", 0.35, "TER-ITB", 0.10, "TER-ANI", 0.55, "TER-COP", 0.15, "TER-COR", 0.15, "TER-TUR", 0.60);

    private static final Map<String, Map<String, Double>> PENALIDADE_TERRITORIO = Map.of(
            "TER-ITB", Map.of("Frações", 0.50, "Inferência", 0.20),
            "TER-COP", Map.of("Frações", 0.45, "Resolução de problemas", 0.30),
            "TER-COR", Map.of("Inferência", 0.55, "Alfabetização", 0.40, "Coesão textual", 0.25),
            "TER-CEN", Map.of("Resolução de problemas", 0.15),
            "TER-TUR", Map.of("Álgebra e funções", 0.50),
            "TER-ANI", Map.of());

    private static final Set<String> ESCOLAS_COM_5B = Set.of("E01", "E04", "E05", "E07", "E10", "E11", "E13", "E14", "E16");

    private static final String[] NOMES_F = {"Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Heloísa",
            "Isabela", "Júlia", "Larissa", "Lívia", "Maria Clara", "Mariana", "Nicole", "Rafaela", "Sophia", "Valentina", "Yasmin",
            "Alice", "Cecília", "Clara", "Emanuelly", "Esther", "Laura", "Luana", "Manuela", "Melissa", "Pietra", "Vitória"};
    private static final String[] NOMES_M = {"Arthur", "Bernardo", "Caio", "Davi", "Enzo", "Felipe", "Gabriel", "Gustavo", "Heitor",
            "Isaac", "João Pedro", "Kauã", "Lucas", "Matheus", "Miguel", "Nicolas", "Otávio", "Pedro", "Rafael", "Samuel",
            "Thiago", "Vinícius", "Benício", "Cauã", "Emanuel", "Henrique", "Joaquim", "Lorenzo", "Murilo", "Ryan"};
    private static final String[] SOBRENOMES = {"Almeida", "Barbosa", "Cardoso", "Costa", "Dias", "Ferreira", "Gomes", "Lima",
            "Machado", "Martins", "Melo", "Moraes", "Nascimento", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva",
            "Sousa", "Teixeira", "Vieira", "Araújo", "Castro", "Correia", "Freitas", "Mendes", "Nunes", "Pinheiro", "Serra"};

    record Turma(String id, String escolaId, String territorioId, int ano, String nome, String turno, double offset) {}

    record Estudante(String id, String nome, String turmaId, double theta, Map<String, Double> ajusteGrupo) {}

    record Hab(String id, String componenteId, int ano, String grupo, String descritorId) {}

    record PlanoCandidato(String turmaId, String habilidadeId, String status, LocalDate inicio, LocalDate prazo, boolean atrasado) {}

    private final Random rng = new Random(SEMENTE);
    private final Map<String, String> territorioDaEscola = new LinkedHashMap<>();
    private final Map<String, String> nomeEscola = new LinkedHashMap<>();
    private final List<Turma> turmas = new ArrayList<>();
    private final List<Estudante> estudantes = new ArrayList<>();
    private final List<Hab> habs = new ArrayList<>();
    private final Map<String, List<String[]>> vinculos = new LinkedHashMap<>(); // turma -> [professorId, componente]
    private final Map<String, String> nomeProfessor = new LinkedHashMap<>();
    private final Map<String, String> escolaProfessor = new LinkedHashMap<>();
    private final Map<String, String> usuarioDoProfessor = new LinkedHashMap<>();
    private final Map<String, String> coordenadorDaEscola = new LinkedHashMap<>();
    /** acertos por estudante|avaliação|habilidade */
    private final Map<String, int[]> resultados = new HashMap<>();
    /** bônus por turma|habilidade aplicado na AV3 (efeito associado a intervenções da demonstração) */
    private final Map<String, Double> bonusAv3 = new HashMap<>();
    private final Map<String, Double> bonusAv3Estudante = new HashMap<>();
    private final Map<String, Double> bonusAv2Estudante = new HashMap<>();

    // ------------------------------------------------------------------ execução

    @Override
    public void run(ApplicationArguments args) {
        if (!props.demo().seed()) return;
        Integer existentes = jdbc.queryForObject("SELECT COUNT(*) FROM turma", Integer.class);
        if (existentes != null && existentes > 0) {
            log.info("Dados demonstrativos já carregados ({} turmas).", existentes);
            return;
        }
        long t0 = System.currentTimeMillis();
        tx.executeWithoutResult(s -> gerar());
        catalogo.recarregar();
        fatos.invalidar();
        log.info("Dados demonstrativos gerados em {} ms: {} turmas, {} estudantes.", System.currentTimeMillis() - t0, turmas.size(), estudantes.size());
    }

    private void gerar() {
        carregarReferencias();
        criarTurmasProfessores();
        criarEstudantes();
        criarUsuarios();
        gerarResultados(0);
        gerarResultados(1);
        List<PlanoCandidato> candidatos = escolherPlanosDeTurma();
        configurarHistoriaPrincipal();
        gerarResultados(2);
        persistirResultados();
        criarPlanosDeTurma(candidatos);
        criarPlanosDaHistoria();
        criarParticipacoes();
    }

    private void carregarReferencias() {
        jdbc.query("SELECT id, territorio_id, nome FROM escola ORDER BY id", rs -> {
            territorioDaEscola.put(rs.getString(1), rs.getString(2));
            nomeEscola.put(rs.getString(1), rs.getString(3));
        });
        jdbc.query("""
                SELECT h.id, h.componente_id, h.ano_escolar, h.grupo, dh.descritor_id
                  FROM habilidade h JOIN descritor_habilidade dh ON dh.habilidade_id = h.id ORDER BY h.ano_escolar, h.componente_id, h.id""",
                rs -> { habs.add(new Hab(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getString(4), rs.getString(5))); });
    }

    private void criarTurmasProfessores() {
        Map<String, Double> offsetEscola = new HashMap<>();
        int nProf = 0;
        Set<String> usados = new HashSet<>();
        for (String escola : territorioDaEscola.keySet()) {
            offsetEscola.put(escola, rng.nextGaussian() * 0.15);
            // Escola da jornada principal: desempenho geral próximo da média da rede, com dificuldade concentrada em frações.
            if (escola.equals("E04")) offsetEscola.put(escola, 0.30);
            boolean finais = jdbc.queryForObject("SELECT etapas FROM escola WHERE id = ?", String.class, escola).contains("finais");
            List<Object[]> defs = new ArrayList<>();
            defs.add(new Object[]{2, "A", "Matutino"});
            defs.add(new Object[]{5, "A", "Matutino"});
            if (ESCOLAS_COM_5B.contains(escola)) defs.add(new Object[]{5, "B", "Vespertino"});
            if (finais) defs.add(new Object[]{9, "A", "Vespertino"});
            for (Object[] d : defs) {
                int ano = (int) d[0];
                String id = escola + "-" + ano + d[1];
                Turma t = new Turma(id, escola, territorioDaEscola.get(escola), ano, ano + "º ano " + d[1], (String) d[2],
                        offsetEscola.get(escola) + rng.nextGaussian() * 0.12);
                turmas.add(t);
                jdbc.update("INSERT INTO turma (id, escola_id, ano_escolar, nome, turno, ano_letivo) VALUES (?,?,?,?,?,2026)",
                        t.id(), escola, ano, t.nome(), t.turno());
                List<String> comps = ano == 9 ? List.of("MAT", "LP") : List.of("POLI");
                for (String c : comps) {
                    nProf++;
                    String pid = String.format("P%03d", nProf);
                    String nome;
                    if (id.equals("E04-5A")) nome = "Helena Duarte";
                    else if (id.equals("E10-5A")) nome = "Paulo Sérgio Lima";
                    else nome = nomeUnico(usados);
                    usados.add(nome);
                    nomeProfessor.put(pid, nome);
                    escolaProfessor.put(pid, escola);
                    jdbc.update("INSERT INTO professor (id, nome, escola_id) VALUES (?,?,?)", pid, nome, escola);
                    for (String comp : c.equals("POLI") ? List.of("MAT", "LP") : List.of(c)) {
                        jdbc.update("INSERT INTO professor_turma (professor_id, turma_id, componente_id) VALUES (?,?,?)", pid, id, comp);
                        vinculos.computeIfAbsent(id, k -> new ArrayList<>()).add(new String[]{pid, comp});
                    }
                }
            }
        }
    }

    private String nomeUnico(Set<String> usados) {
        for (int i = 0; i < 100; i++) {
            boolean f = rng.nextBoolean();
            String nome = (f ? NOMES_F[rng.nextInt(NOMES_F.length)] : NOMES_M[rng.nextInt(NOMES_M.length)]) + " "
                    + SOBRENOMES[rng.nextInt(SOBRENOMES.length)] + " " + SOBRENOMES[rng.nextInt(SOBRENOMES.length)];
            if (!usados.contains(nome)) return nome;
        }
        return "Professor(a) " + usados.size();
    }

    private void criarEstudantes() {
        int seq = 0;
        List<Object[]> batch = new ArrayList<>();
        for (Turma t : turmas) {
            int n = 20 + rng.nextInt(7);
            Set<String> nomes = new HashSet<>();
            double base = BASE_TERRITORIO.get(t.territorioId()) + t.offset();
            for (int i = 0; i < n; i++) {
                seq++;
                String id = String.format("A%05d", seq);
                String nome;
                Map<String, Double> ajuste = new HashMap<>();
                double theta = base + rng.nextGaussian() * 0.85;
                // Estudantes da jornada principal (5º ano A — EM Mangue Vivo)
                if (t.id().equals("E04-5A") && i == 0) {
                    nome = "Davi S.";
                    theta = base + 0.55;
                    ajuste.put("Frações", -1.45);
                } else if (t.id().equals("E04-5A") && i == 1) {
                    nome = "Lívia M.";
                    theta = base + 0.25;
                    ajuste.put("Inferência", -0.9);
                } else if (t.id().equals("E04-5A") && i == 2) {
                    nome = "Caio R.";
                    theta = base + 0.1;
                    ajuste.put("Frações", -0.7);
                } else {
                    do {
                        boolean f = rng.nextBoolean();
                        nome = (f ? NOMES_F[rng.nextInt(NOMES_F.length)] : NOMES_M[rng.nextInt(NOMES_M.length)]) + " "
                                + SOBRENOMES[rng.nextInt(SOBRENOMES.length)].charAt(0) + ".";
                    } while (nomes.contains(nome) || nome.equals("Davi S.") || nome.equals("Lívia M.") || nome.equals("Caio R."));
                }
                nomes.add(nome);
                estudantes.add(new Estudante(id, nome, t.id(), theta, ajuste));
                batch.add(new Object[]{id, String.format("SLZ26-%05d", seq), nome, t.id()});
            }
        }
        jdbc.batchUpdate("INSERT INTO estudante (id, codigo, nome, turma_id) VALUES (?,?,?,?)", batch);
    }

    private void criarUsuarios() {
        String hash = encoder.encode(props.demo().senha());
        // Gestão da rede
        usuario("U-SEMED", "semed@conecta.demo", "Rosângela Mendes", "GESTOR_REDE",
                "Superintendência de Ensino Fundamental — SEMED (perfil demonstrativo)", null, null, true, hash);
        // Coordenações
        for (String e : territorioDaEscola.keySet()) {
            String uid = "U-COORD-" + e;
            boolean dest = e.equals("E04") || e.equals("E10");
            String nome = switch (e) { case "E04" -> "Marcos Ribeiro"; case "E10" -> "Juliana Costa"; default -> nomeUnico(new HashSet<>(nomeProfessor.values())); };
            String email = switch (e) { case "E04" -> "coordenacao.manguevivo@conecta.demo"; case "E10" -> "coordenacao.babacu@conecta.demo";
                default -> "coordenacao." + e.toLowerCase() + "@conecta.demo"; };
            usuario(uid, email, nome, "COORDENADOR", "Coordenação pedagógica — " + nomeEscola.get(e), e, null, dest, hash);
            coordenadorDaEscola.put(e, uid);
        }
        // Professores
        for (var en : nomeProfessor.entrySet()) {
            String pid = en.getKey();
            String uid = "U-" + pid;
            String nome = en.getValue();
            String email = switch (nome) { case "Helena Duarte" -> "professora.helena@conecta.demo"; case "Paulo Sérgio Lima" -> "professor.paulo@conecta.demo";
                default -> "prof." + pid.toLowerCase() + "@conecta.demo"; };
            boolean dest = nome.equals("Helena Duarte") || nome.equals("Paulo Sérgio Lima");
            String turmasTxt = vinculos.entrySet().stream().filter(v -> v.getValue().stream().anyMatch(x -> x[0].equals(pid)))
                    .map(v -> turmaPorId(v.getKey()).nome()).distinct().reduce((a, b) -> a + ", " + b).orElse("");
            usuario(uid, email, nome, "PROFESSOR", "Professor(a) — " + turmasTxt + " — " + nomeEscola.get(escolaProfessor.get(pid)),
                    escolaProfessor.get(pid), pid, dest, hash);
            usuarioDoProfessor.put(pid, uid);
        }
    }

    private void usuario(String id, String email, String nome, String papel, String cargo, String escola, String prof, boolean destaque, String hash) {
        jdbc.update("""
                INSERT INTO usuario (id, email, nome, senha_hash, papel, cargo, escola_id, professor_id, ativo, destaque)
                VALUES (?,?,?,?,?,?,?,?,TRUE,?)""", id, email, nome, hash, papel, cargo, escola, prof, destaque);
    }

    // ------------------------------------------------------------------ resultados

    private void gerarResultados(int a) {
        for (Estudante e : estudantes) {
            Turma t = turmaPorId(e.turmaId());
            boolean historia = e.nome().equals("Davi S.") || e.nome().equals("Lívia M.") || e.nome().equals("Caio R.");
            if (!historia && rng.nextDouble() < 0.05) continue; // ausência na aplicação
            for (Hab h : habs) {
                if (h.ano() != t.ano()) continue;
                int itens = t.ano() == 2 ? 4 : 5;
                double logit = e.theta() + CRESCIMENTO[a] - DIFICULDADE_GRUPO.get(h.grupo())
                        - PENALIDADE_TERRITORIO.get(t.territorioId()).getOrDefault(h.grupo(), 0.0)
                        + e.ajusteGrupo().getOrDefault(h.grupo(), 0.0);
                if (a == 2) {
                    logit += bonusAv3.getOrDefault(t.id() + "|" + h.id(), 0.0);
                    logit += bonusAv3Estudante.getOrDefault(e.id() + "|" + h.id(), 0.0);
                    // queda pontual demonstrativa: 2º ano da EM Sabiá em compreensão leitora
                    if (t.id().equals("E09-2A") && h.grupo().equals("Compreensão leitora")) logit -= 0.7;
                }
                if (a == 1) logit += bonusAv2Estudante.getOrDefault(e.id() + "|" + h.id(), 0.0);
                double p = 1.0 / (1.0 + Math.exp(-logit));
                int acertos = 0;
                for (int i = 0; i < itens; i++) if (rng.nextDouble() < p) acertos++;
                resultados.put(e.id() + "|" + AVS[a] + "|" + h.id(), new int[]{acertos, itens});
            }
        }
    }

    private void persistirResultados() {
        Map<String, Hab> habPorId = new HashMap<>();
        habs.forEach(h -> habPorId.put(h.id(), h));
        Map<String, Estudante> estPorId = new HashMap<>();
        estudantes.forEach(e -> estPorId.put(e.id(), e));
        List<Object[]> batch = new ArrayList<>();
        List<String> chaves = new ArrayList<>(resultados.keySet());
        Collections.sort(chaves);
        for (String k : chaves) {
            String[] p = k.split("\\|");
            int[] r = resultados.get(k);
            batch.add(new Object[]{p[1], p[0], estPorId.get(p[0]).turmaId(), habPorId.get(p[2]).descritorId(), r[0], r[1]});
            if (batch.size() == 2000) {
                jdbc.batchUpdate("INSERT INTO resultado (avaliacao_id, estudante_id, turma_id, descritor_id, acertos, itens) VALUES (?,?,?,?,?,?)", batch);
                batch.clear();
            }
        }
        if (!batch.isEmpty()) {
            jdbc.batchUpdate("INSERT INTO resultado (avaliacao_id, estudante_id, turma_id, descritor_id, acertos, itens) VALUES (?,?,?,?,?,?)", batch);
        }
    }

    /** Percentual de acerto (soma de acertos / soma de itens) de uma turma numa habilidade e avaliação. */
    private Double pctTurma(String turmaId, String habId, int a) {
        long ac = 0, it = 0;
        for (Estudante e : estudantes) {
            if (!e.turmaId().equals(turmaId)) continue;
            int[] r = resultados.get(e.id() + "|" + AVS[a] + "|" + habId);
            if (r != null) { ac += r[0]; it += r[1]; }
        }
        return it == 0 ? null : Math.round(1000.0 * ac / it) / 10.0;
    }

    private Double pctFiltro(java.util.function.Predicate<Turma> turmaFiltro, Collection<String> habIds, int a) {
        long ac = 0, it = 0;
        for (Estudante e : estudantes) {
            if (!turmaFiltro.test(turmaPorId(e.turmaId()))) continue;
            for (String h : habIds) {
                int[] r = resultados.get(e.id() + "|" + AVS[a] + "|" + h);
                if (r != null) { ac += r[0]; it += r[1]; }
            }
        }
        return it == 0 ? null : Math.round(1000.0 * ac / it) / 10.0;
    }

    private Double pctEstudante(String estId, Collection<String> habIds, int a) {
        long ac = 0, it = 0;
        for (String h : habIds) {
            int[] r = resultados.get(estId + "|" + AVS[a] + "|" + h);
            if (r != null) { ac += r[0]; it += r[1]; }
        }
        return it == 0 ? null : Math.round(1000.0 * ac / it) / 10.0;
    }

    // ------------------------------------------------------------------ planos de turma (genéricos, derivados dos dados)

    private static final Set<String> TURMAS_HISTORIA = Set.of("E04-2A", "E04-5A", "E04-5B", "E04-9A", "E10-5A", "E13-5A");

    private List<PlanoCandidato> escolherPlanosDeTurma() {
        List<PlanoCandidato> out = new ArrayList<>();
        for (Turma t : turmas) {
            if (TURMAS_HISTORIA.contains(t.id())) continue;
            String pior = null;
            double piorPct = 101;
            for (Hab h : habs) {
                if (h.ano() != t.ano()) continue;
                Double p = pctTurma(t.id(), h.id(), 1);
                if (p != null && p < piorPct) { piorPct = p; pior = h.id(); }
            }
            if (pior == null || piorPct >= 50 || rng.nextDouble() > 0.55) continue;
            double r = rng.nextDouble();
            LocalDate inicio = LocalDate.of(2026, 6, 22).plusDays(rng.nextInt(15));
            String status;
            LocalDate prazo;
            boolean atrasado = false;
            if (r < 0.35) { status = "REAVALIADO"; prazo = inicio.plusWeeks(8); bonusAv3.put(t.id() + "|" + pior, 0.35 + rng.nextDouble() * 0.3); }
            else if (r < 0.55) { status = "CONCLUIDO"; prazo = inicio.plusWeeks(9); bonusAv3.put(t.id() + "|" + pior, 0.2 + rng.nextDouble() * 0.3); }
            else if (r < 0.85) {
                status = "EM_ANDAMENTO";
                atrasado = rng.nextDouble() < 0.4;
                prazo = atrasado ? LocalDate.of(2026, 10, 30) : LocalDate.of(2026, 12, 11);
                bonusAv3.put(t.id() + "|" + pior, 0.15);
            } else { status = "PLANEJADO"; inicio = LocalDate.of(2026, 11, 23); prazo = LocalDate.of(2027, 2, 26); }
            out.add(new PlanoCandidato(t.id(), pior, status, inicio, prazo, atrasado));
        }
        return out;
    }

    private void configurarHistoriaPrincipal() {
        // EM Babaçu — 5º A: intervenção em frações concluída antes da AV3
        bonusAv3.put("E10-5A|EF05MA03", 0.55);
        bonusAv3.put("E10-5A|EF05MA04", 0.50);
        // EM Cacuriá — 5º A: intervenção em inferência com efeito pequeno
        bonusAv3.put("E13-5A|EF35LP04", 0.08);
        // Lívia (E04-5A): intervenção individual em inferência entre AV2 e AV3
        String livia = estudantePorNome("E04-5A", "Lívia M.").id();
        bonusAv3Estudante.put(livia + "|EF35LP04", 1.1);
        // Davi (E04-5A): intervenção anterior em vocabulário (EF35LP05) entre AV1 e AV2
        String davi = estudantePorNome("E04-5A", "Davi S.").id();
        bonusAv2Estudante.put(davi + "|EF35LP05", 0.5);
        bonusAv3Estudante.put(davi + "|EF35LP05", 0.5);
    }

    private void criarPlanosDeTurma(List<PlanoCandidato> candidatos) {
        for (PlanoCandidato c : candidatos) {
            Turma t = turmaPorId(c.turmaId());
            Hab h = habPorId(c.habilidadeId());
            String compProf = h.componenteId();
            String profId = vinculos.get(t.id()).stream().filter(v -> v[1].equals(compProf)).findFirst().orElseThrow()[0];
            String[] est = estrategiaPara(h.id());
            int baseIdx = baseIdx(c.inicio());
            Double pBase = pctTurma(t.id(), h.id(), baseIdx);
            Double pRede = pctFiltro(x -> x.ano() == t.ano(), List.of(h.id()), baseIdx);
            String grupo = h.grupo().toLowerCase();
            long id = inserirPlano("TURMA", t.territorioId(), t.escolaId(), t.id(), null, null, h.componenteId(),
                    "Intervenção em " + grupo + " — " + t.nome(),
                    "A turma apresentou dificuldade na habilidade " + h.id() + " (" + grupo + ") na " + sigla(baseIdx) + ".",
                    "Percentual de acerto da turma em " + h.id() + " na " + sigla(baseIdx) + ": " + fmt(pBase)
                            + " (referência do " + t.ano() + "º ano na rede: " + fmt(pRede) + "). Dados demonstrativos.",
                    "Ampliar a compreensão dos estudantes na habilidade " + h.id() + ", reduzindo o número de estudantes com resultado que requer atenção.",
                    "Estudantes do " + t.nome(), est[1], est[0], null, nomeProfessor.get(profId) + " (professor(a) da turma)",
                    c.inicio(), c.prazo(),
                    "Percentual de acerto em " + h.id() + " na próxima avaliação comparável e registros semanais de acompanhamento.",
                    "Sequência de atividades concluída e reavaliação direcionada aplicada.",
                    "Elevar o percentual de acerto da turma para ao menos 50% na habilidade.",
                    c.status(), AVS[baseIdx], usuarioDoProfessor.get(profId), List.of(h.id()));
            completarCiclo(id, c.status(), c.inicio(), c.prazo(), usuarioDoProfessor.get(profId), coordenadorDaEscola.get(t.escolaId()),
                    est[1], nomeProfessor.get(profId));
            if ("REAVALIADO".equals(c.status())) {
                reavaliar(id, pctTurma(t.id(), h.id(), 1), pctTurma(t.id(), h.id(), 2), h.id(), "da turma",
                        LocalDate.of(2026, 9, 30), usuarioDoProfessor.get(profId));
            }
        }
    }

    private void criarPlanosDaHistoria() {
        String semed = "U-SEMED";
        String coordE04 = coordenadorDaEscola.get("E04");
        String helena = usuarioDoProfessor.entrySet().stream().filter(e -> nomeProfessor.get(e.getKey()).equals("Helena Duarte")).findFirst().orElseThrow().getValue();
        String paulo = usuarioDoProfessor.entrySet().stream().filter(e -> nomeProfessor.get(e.getKey()).equals("Paulo Sérgio Lima")).findFirst().orElseThrow().getValue();
        List<String> fracoes = List.of("EF05MA03", "EF05MA04", "EF05MA05");

        // ---- Plano territorial (SEMED) — Itaqui-Bacanga, frações
        Double pTer = pctFiltro(x -> x.territorioId().equals("TER-ITB") && x.ano() == 5, fracoes, 1);
        Double pRede = pctFiltro(x -> x.ano() == 5, fracoes, 1);
        long ter = inserirPlano("TERRITORIO", "TER-ITB", null, null, null, null, "MAT",
                "Apoio ao ensino de frações — território Itaqui-Bacanga",
                "Escolas do território apresentam dificuldades recorrentes nas habilidades de frações do 5º ano (EF05MA03, EF05MA04 e EF05MA05).",
                "Na AV2, o percentual de acerto do território nessas habilidades foi de " + fmt(pTer) + ", ante " + fmt(pRede)
                        + " no conjunto da rede (dados demonstrativos). Resultado abaixo do limiar de atenção nas escolas do território.",
                "Apoiar as escolas do território no ensino de frações, com formação específica e acompanhamento das coordenações.",
                "Coordenações e professores do 5º ano das escolas do território Itaqui-Bacanga",
                "Oferta prioritária da formação “Frações com materiais manipuláveis e reta numérica”, visitas de acompanhamento pedagógico e "
                        + "encontros mensais com as coordenações para compartilhar estratégias.",
                null, "FOR-01", "Rosângela Mendes (SEMED — Ensino Fundamental)", LocalDate.of(2026, 7, 20), LocalDate.of(2026, 12, 11),
                "Participação das escolas na formação; planos escolares ativos; percentual de acerto nas habilidades de frações na próxima avaliação.",
                "Todas as escolas do território com plano escolar ativo e formação concluída pelos professores do 5º ano.",
                "Redução do número de turmas do 5º ano abaixo do limiar de atenção em frações.",
                "EM_ANDAMENTO", "AV2-2026", semed, fracoes);
        completarCiclo(ter, "EM_ANDAMENTO", LocalDate.of(2026, 7, 20), LocalDate.of(2026, 12, 11), semed, semed,
                "formação e acompanhamento", "Equipe SEMED");

        // ---- Plano territorial planejado — Coroadinho / João Paulo, inferência
        List<String> infer = List.of("EF35LP04", "EF35LP05");
        Double pCor = pctFiltro(x -> x.territorioId().equals("TER-COR") && x.ano() == 5, infer, 2);
        long terCor = inserirPlano("TERRITORIO", "TER-COR", null, null, null, null, "LP",
                "Leitura inferencial nos anos iniciais — Coroadinho / João Paulo",
                "Turmas de 5º ano do território apresentam resultado abaixo do limiar de atenção em habilidades de inferência.",
                "Na AV3, o percentual de acerto do território em EF35LP04 e EF35LP05 foi de " + fmt(pCor) + " (dados demonstrativos).",
                "Fortalecer práticas de leitura inferencial nas escolas do território.",
                "Professores do 3º ao 5º ano das escolas do território",
                "Turma específica da formação “Leitura inferencial nos anos iniciais” e banco de sequências didáticas compartilhado.",
                null, "FOR-03", "Rosângela Mendes (SEMED — Ensino Fundamental)", LocalDate.of(2026, 11, 30), LocalDate.of(2027, 3, 26),
                "Adesão das escolas, planos escolares relacionados e resultado em inferência na próxima avaliação diagnóstica.",
                "Formação concluída e planos escolares registrados nas três escolas.",
                "Elevar o percentual de acerto do território nas habilidades de inferência.",
                "PLANEJADO", "AV3-2026", semed, infer);
        completarCiclo(terCor, "PLANEJADO", LocalDate.of(2026, 11, 30), LocalDate.of(2027, 3, 26), semed, semed, "", "");

        // ---- Plano escolar — EM Mangue Vivo, frações no 5º ano (vinculado ao territorial)
        Double p5A = pctFiltro(x -> x.id().equals("E04-5A"), List.of("EF05MA03", "EF05MA04"), 2);
        Double p5B = pctFiltro(x -> x.id().equals("E04-5B"), List.of("EF05MA03", "EF05MA04"), 2);
        long esc = inserirPlano("ESCOLA", "TER-ITB", "E04", null, null, ter, "MAT",
                "Frações nas turmas de 5º ano",
                "As turmas do 5º ano apresentam dificuldades recorrentes relacionadas a frações (representação e equivalência).",
                "AV3: 5º ano A com " + fmt(p5A) + " e 5º ano B com " + fmt(p5B) + " de acerto em EF05MA03 e EF05MA04 (dados demonstrativos).",
                "Desenvolver a compreensão de frações como parte de um todo e como número, nas duas turmas do 5º ano.",
                "Estudantes do 5º ano A e do 5º ano B",
                "Sequência comum com tiras de frações e reta numérica (2 aulas semanais), planejamento quinzenal entre as professoras e "
                        + "reavaliação direcionada ao fim de novembro.",
                "EST-FR1", "FOR-01", "Marcos Ribeiro (coordenação pedagógica)", LocalDate.of(2026, 10, 5), LocalDate.of(2026, 12, 4),
                "Registros quinzenais das turmas e reavaliação direcionada em EF05MA03 e EF05MA04.",
                "Sequência aplicada nas duas turmas e reavaliação registrada.",
                "Mais da metade dos estudantes com resultado ao menos em desenvolvimento nas duas habilidades.",
                "EM_ANDAMENTO", "AV3-2026", coordE04, List.of("EF05MA03", "EF05MA04"));
        completarCiclo(esc, "EM_ANDAMENTO", LocalDate.of(2026, 10, 5), LocalDate.of(2026, 12, 4), coordE04, coordE04,
                "tiras de frações e reta numérica", "Coordenação");

        // ---- Planos individuais na turma da professora Helena
        Estudante caio = estudantePorNome("E04-5A", "Caio R.");
        long pc = inserirPlano("ESTUDANTE", "TER-ITB", "E04", "E04-5A", caio.id(), esc, "MAT",
                "Frações com material concreto — Caio R.",
                "Dificuldade em representar frações como parte de um todo.",
                "EF05MA03 na AV3: " + resultadoTxt(caio.id(), "EF05MA03", 2) + "; na AV2: " + resultadoTxt(caio.id(), "EF05MA03", 1) + ".",
                "Representar frações com material concreto e desenho, e associá-las à escrita numérica.",
                "Caio R. (5º ano A)", "Atividades com tiras e discos de frações em pequeno grupo, duas vezes por semana, com registro em desenho.",
                "EST-FR1", null, "Helena Duarte (professora da turma)", LocalDate.of(2026, 10, 13), LocalDate.of(2026, 11, 27),
                "Ficha de acompanhamento semanal (sim / com apoio / ainda não) e reavaliação direcionada.",
                "Sequência concluída e reavaliação direcionada aplicada.",
                "Nomear e representar frações simples sem apoio do material.",
                "EM_ANDAMENTO", "AV3-2026", helena, List.of("EF05MA03"));
        completarCiclo(pc, "EM_ANDAMENTO", LocalDate.of(2026, 10, 13), LocalDate.of(2026, 11, 27), helena, coordE04,
                "Frações com material concreto", "Helena Duarte");

        Estudante livia = estudantePorNome("E04-5A", "Lívia M.");
        long pl = inserirPlano("ESTUDANTE", "TER-ITB", "E04", "E04-5A", livia.id(), null, "LP",
                "Leitura inferencial — Lívia M.",
                "Dificuldade em inferir informações implícitas em textos.",
                "EF35LP04 na AV2: " + resultadoTxt(livia.id(), "EF35LP04", 1) + "; na AV1: " + resultadoTxt(livia.id(), "EF35LP04", 0) + ".",
                "Identificar pistas no texto que sustentam inferências.",
                "Lívia M. (5º ano A)", "Leitura com perguntas inferenciais antes, durante e depois, com textos curtos semanais.",
                "EST-LE1", null, "Helena Duarte (professora da turma)", LocalDate.of(2026, 6, 22), LocalDate.of(2026, 8, 28),
                "Registro semanal das justificativas com pistas textuais e reavaliação direcionada.",
                "Oito semanas de atividades e reavaliação registrada.",
                "Justificar inferências com pistas do texto na maioria das atividades.",
                "REAVALIADO", "AV2-2026", helena, List.of("EF35LP04"));
        completarCiclo(pl, "REAVALIADO", LocalDate.of(2026, 6, 22), LocalDate.of(2026, 8, 28), helena, coordE04,
                "Leitura com perguntas inferenciais", "Helena Duarte");
        // Reavaliação direcionada registrada pela professora (instrumento próprio, não comparável)
        String rd = "RD-00001";
        jdbc.update("""
                INSERT INTO avaliacao (id, sigla, nome, tipo, data_aplicacao, ano_letivo, matriz, grupo_comparabilidade)
                VALUES (?, 'RD', 'Reavaliação direcionada (registro docente)', 'REAVALIACAO_DIRECIONADA', ?, 2026, 'INSTRUMENTO-DOCENTE', NULL)""",
                rd, Date.valueOf(LocalDate.of(2026, 8, 26)));
        jdbc.update("INSERT INTO resultado (avaliacao_id, estudante_id, turma_id, descritor_id, acertos, itens, registrado_por, registrado_em) VALUES (?,?,?,?,?,?,?,?)",
                rd, livia.id(), "E04-5A", "D-L5-02", 4, 5, helena, Timestamp.valueOf(LocalDateTime.of(2026, 8, 26, 10, 0)));
        registro(pl, "ACOMPANHAMENTO", LocalDate.of(2026, 8, 26), "Reavaliação direcionada em EF35LP04: 4 de 5 itens (80%).", "AVANCO", helena);
        reavaliar(pl, pctEstudante(livia.id(), List.of("EF35LP04"), 1), pctEstudante(livia.id(), List.of("EF35LP04"), 2), "EF35LP04",
                "da estudante", LocalDate.of(2026, 9, 30), helena);

        Estudante davi = estudantePorNome("E04-5A", "Davi S.");
        long pd = inserirPlano("ESTUDANTE", "TER-ITB", "E04", "E04-5A", davi.id(), null, "LP",
                "Vocabulário em contexto — Davi S.",
                "Dificuldade em inferir o sentido de palavras a partir do contexto.",
                "EF35LP05 na AV1: " + resultadoTxt(davi.id(), "EF35LP05", 0) + ".",
                "Formular hipóteses de sentido para palavras desconhecidas usando pistas do texto.",
                "Davi S. (5º ano A)", "Glossário contextual semanal com hipóteses antes da consulta ao dicionário.",
                "EST-LE2", null, "Helena Duarte (professora da turma)", LocalDate.of(2026, 4, 6), LocalDate.of(2026, 6, 5),
                "Número de hipóteses adequadas ao contexto por atividade.",
                "Oito semanas de atividades concluídas.", "Hipóteses adequadas na maior parte das atividades.",
                "REAVALIADO", "AV1-2026", helena, List.of("EF35LP05"));
        completarCiclo(pd, "REAVALIADO", LocalDate.of(2026, 4, 6), LocalDate.of(2026, 6, 5), helena, coordE04,
                "Glossário contextual", "Helena Duarte");
        reavaliar(pd, pctEstudante(davi.id(), List.of("EF35LP05"), 0), pctEstudante(davi.id(), List.of("EF35LP05"), 1), "EF35LP05",
                "do estudante", LocalDate.of(2026, 6, 22), helena);

        // ---- EM Babaçu — 5º A: plano de turma reavaliado
        long pb = inserirPlano("TURMA", "TER-COP", "E10", "E10-5A", null, null, "MAT",
                "Frações com material concreto — 5º ano A",
                "Dificuldade recorrente em frações (representação e equivalência) na turma.",
                "EF05MA03 e EF05MA04 na AV2: " + fmt(pctFiltro(x -> x.id().equals("E10-5A"), List.of("EF05MA03", "EF05MA04"), 1))
                        + " de acerto; na AV1: " + fmt(pctFiltro(x -> x.id().equals("E10-5A"), List.of("EF05MA03", "EF05MA04"), 0)) + ".",
                "Construir o significado de fração com material concreto antes da representação simbólica.",
                "Estudantes do 5º ano A", "Sequência com tiras e discos de frações (3 aulas semanais por 8 semanas) e dominó de equivalentes.",
                "EST-FR1", null, "Paulo Sérgio Lima (professor da turma)", LocalDate.of(2026, 6, 29), LocalDate.of(2026, 8, 28),
                "Ficha de acompanhamento semanal e percentual de acerto na AV3.",
                "Sequência concluída e reavaliação registrada.", "Elevar o percentual de acerto para ao menos 50%.",
                "REAVALIADO", "AV2-2026", paulo, List.of("EF05MA03", "EF05MA04"));
        completarCiclo(pb, "REAVALIADO", LocalDate.of(2026, 6, 29), LocalDate.of(2026, 8, 28), paulo, coordenadorDaEscola.get("E10"),
                "Frações com material concreto", "Paulo Sérgio Lima");
        reavaliar(pb, pctFiltro(x -> x.id().equals("E10-5A"), List.of("EF05MA03", "EF05MA04"), 1),
                pctFiltro(x -> x.id().equals("E10-5A"), List.of("EF05MA03", "EF05MA04"), 2), "EF05MA03 e EF05MA04", "da turma",
                LocalDate.of(2026, 9, 30), paulo);

        // ---- EM Cacuriá — 5º A: plano de turma reavaliado (efeito pequeno)
        String profCac = vinculos.get("E13-5A").get(0)[0];
        String uCac = usuarioDoProfessor.get(profCac);
        long pk = inserirPlano("TURMA", "TER-COR", "E13", "E13-5A", null, null, "LP",
                "Leitura inferencial — 5º ano A",
                "Dificuldade em inferir informações implícitas.",
                "EF35LP04 na AV2: " + fmt(pctTurma("E13-5A", "EF35LP04", 1)) + " de acerto.",
                "Desenvolver estratégias de leitura inferencial.", "Estudantes do 5º ano A",
                "Leitura com perguntas inferenciais em textos curtos, duas vezes por semana.",
                "EST-LE1", null, nomeProfessor.get(profCac) + " (professor(a) da turma)", LocalDate.of(2026, 7, 6), LocalDate.of(2026, 8, 31),
                "Registro das justificativas e percentual de acerto na AV3.", "Sequência concluída.", "Elevar o percentual de acerto para 50%.",
                "REAVALIADO", "AV2-2026", uCac, List.of("EF35LP04"));
        completarCiclo(pk, "REAVALIADO", LocalDate.of(2026, 7, 6), LocalDate.of(2026, 8, 31), uCac, coordenadorDaEscola.get("E13"),
                "Leitura com perguntas inferenciais", nomeProfessor.get(profCac));
        reavaliar(pk, pctTurma("E13-5A", "EF35LP04", 1), pctTurma("E13-5A", "EF35LP04", 2), "EF35LP04", "da turma",
                LocalDate.of(2026, 9, 30), uCac);
    }

    private void criarParticipacoes() {
        LocalDateTime quando = LocalDateTime.of(2026, 10, 20, 9, 0);
        String[] aplicacoes = {
                "Apliquei a sequência com a turma e registrei avanços na explicação das estratégias.",
                "Usei as atividades em pequenos grupos; os estudantes passaram a justificar melhor as respostas.",
                "Adaptei as atividades ao contexto da turma, com materiais do cotidiano do bairro.",
                "Incorporei a rotina às aulas semanais e compartilhei o material com a outra turma do mesmo ano."};
        for (var en : nomeProfessor.entrySet()) {
            String pid = en.getKey();
            List<String[]> vs = vinculos.entrySet().stream().flatMap(v -> v.getValue().stream().filter(x -> x[0].equals(pid))
                    .map(x -> new String[]{v.getKey(), x[1]})).toList();
            Set<Integer> anos = new HashSet<>();
            Set<String> comps = new HashSet<>();
            String territorio = territorioDaEscola.get(escolaProfessor.get(pid));
            vs.forEach(v -> { anos.add(turmaPorId(v[0]).ano()); comps.add(v[1]); });
            boolean helena = en.getValue().equals("Helena Duarte");
            boolean paulo = en.getValue().equals("Paulo Sérgio Lima");
            // FOR-02 (concluída) — resolução de problemas
            if (comps.contains("MAT") && (helena || paulo || rng.nextDouble() < 0.35)) {
                boolean aplicou = helena || paulo || rng.nextDouble() < 0.65;
                participacao("FOR-02", pid, "CONCLUIDO", aplicou, aplicou ? aplicacoes[rng.nextInt(aplicacoes.length)] : null, quando);
            }
            // FOR-04 (concluída) — alfabetização
            if (anos.contains(2) && rng.nextDouble() < 0.5) {
                boolean aplicou = rng.nextDouble() < 0.6;
                participacao("FOR-04", pid, "CONCLUIDO", aplicou, aplicou ? aplicacoes[rng.nextInt(aplicacoes.length)] : null, quando);
            }
            // FOR-01 (em curso) — frações, prioridade nos territórios com plano
            if (anos.contains(5) && (helena || ((territorio.equals("TER-ITB") || territorio.equals("TER-COP")) && rng.nextDouble() < 0.6)
                    || rng.nextDouble() < 0.15)) {
                participacao("FOR-01", pid, "INSCRITO", null, null, quando);
            }
            // FOR-03 (em curso) — leitura inferencial
            if (anos.contains(5) && !helena && rng.nextDouble() < 0.3) participacao("FOR-03", pid, "INSCRITO", null, null, quando);
            // FOR-07 (em curso) — geometria
            if (anos.contains(9) && comps.contains("MAT") && rng.nextDouble() < 0.4) participacao("FOR-07", pid, "INSCRITO", null, null, quando);
        }
    }

    private void participacao(String formacao, String prof, String status, Boolean aplicou, String registro, LocalDateTime quando) {
        jdbc.update("INSERT INTO participacao (formacao_id, professor_id, status, aplicou_estrategia, registro_aplicacao, atualizado_em) VALUES (?,?,?,?,?,?)",
                formacao, prof, status, aplicou, registro, Timestamp.valueOf(quando));
    }

    // ------------------------------------------------------------------ helpers de plano

    private long inserirPlano(String escopo, String territorio, String escola, String turma, String estudante, Long pai,
                              String componente, String titulo, String problema, String evidencias, String objetivo, String publico,
                              String estrategia, String estrategiaId, String formacaoId, String responsavel, LocalDate inicio,
                              LocalDate prazo, String indicador, String criterio, String esperado, String status, String avBase,
                              String criadoPor, List<String> habilidades) {
        LocalDateTime criado = LocalDateTime.of(inicio.minusDays(5), LocalTime.of(14, 0));
        jdbc.update("""
                INSERT INTO plano (escopo, territorio_id, escola_id, turma_id, estudante_id, plano_pai_id, componente_id, titulo, problema,
                  evidencias, objetivo, publico_alvo, estrategia, estrategia_id, formacao_id, responsavel, data_inicio, prazo,
                  indicador_acompanhamento, criterio_conclusao, resultado_esperado, status, avaliacao_base_id, criado_por, criado_em,
                  atualizado_em, versao)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)""",
                escopo, territorio, escola, turma, estudante, pai, componente, titulo, problema, evidencias, objetivo, publico,
                estrategia, estrategiaId, formacaoId, responsavel, Date.valueOf(inicio), Date.valueOf(prazo), indicador, criterio,
                esperado, status, avBase, criadoPor, Timestamp.valueOf(criado), Timestamp.valueOf(criado));
        long id = jdbc.queryForObject("SELECT MAX(id) FROM plano", Long.class);
        for (String h : habilidades) jdbc.update("INSERT INTO plano_habilidade (plano_id, habilidade_id) VALUES (?,?)", id, h);
        return id;
    }

    /** Ações, registros e histórico coerentes com a situação do plano e a data de referência. */
    private void completarCiclo(long id, String status, LocalDate inicio, LocalDate prazo, String autor, String coord,
                                String estrategiaCurta, String responsavel) {
        LocalDate hoje = props.demo().dataReferencia() != null ? props.demo().dataReferencia() : LocalDate.now();
        int nivel = switch (status) { case "PLANEJADO" -> 0; case "EM_ANDAMENTO" -> 1; case "CONCLUIDO" -> 2; default -> 3; };
        String resp = responsavel == null || responsavel.isBlank() ? "Responsável pelo plano" : responsavel;
        acao(id, "Planejar a sequência de atividades (" + (estrategiaCurta.isBlank() ? "estratégia definida" : estrategiaCurta) + ")",
                resp, inicio, nivel >= 1 ? "CONCLUIDA" : "PENDENTE", nivel >= 1 ? inicio : null);
        acao(id, "Aplicar as atividades previstas e registrar a execução", resp, inicio.plusDays(7),
                nivel >= 2 ? "CONCLUIDA" : nivel == 1 ? "EM_ANDAMENTO" : "PENDENTE", nivel >= 2 ? prazo.minusDays(7) : null);
        acao(id, "Aplicar reavaliação direcionada com itens equivalentes", resp, prazo.minusDays(3),
                nivel >= 2 ? "CONCLUIDA" : "PENDENTE", nivel >= 2 ? prazo.minusDays(3) : null);
        LocalDateTime criado = LocalDateTime.of(inicio.minusDays(5), LocalTime.of(14, 0));
        historico(id, criado, autor, "CRIACAO", null, "PLANEJADO", null, null);
        if (nivel >= 1) {
            historico(id, LocalDateTime.of(inicio, LocalTime.of(8, 0)), autor, "STATUS", "PLANEJADO", "EM_ANDAMENTO", null, null);
            LocalDate r1 = inicio.plusDays(14), r2 = inicio.plusDays(35);
            if (!r1.isAfter(hoje)) registro(id, "EXECUCAO", r1, "Atividades iniciadas conforme planejado. Estudantes engajados; parte ainda precisa de apoio individual.", "ESTAVEL", autor);
            if (!r2.isAfter(hoje) && (nivel >= 2 || r2.isBefore(prazo))) registro(id, "ACOMPANHAMENTO", r2, "Observa-se avanço na explicação das estratégias. Ajustado o tempo das atividades em pequenos grupos.", "AVANCO", autor);
        }
        if (nivel >= 2) historico(id, LocalDateTime.of(prazo, LocalTime.of(17, 0)), autor, "STATUS", "EM_ANDAMENTO", "CONCLUIDO", null, null);
        jdbc.update("UPDATE plano SET atualizado_em = ? WHERE id = ?", Timestamp.valueOf(
                nivel >= 2 ? LocalDateTime.of(prazo, LocalTime.of(17, 0)) : nivel == 1 ? LocalDateTime.of(inicio.plusDays(14).isAfter(hoje) ? inicio : inicio.plusDays(14), LocalTime.of(18, 0)) : criado), id);
    }

    private void reavaliar(long id, Double antes, Double depois, String habTxt, String sujeito, LocalDate data, String autor) {
        double delta = antes == null || depois == null ? 0 : depois - antes;
        String decisao = delta >= 8 ? "FUNCIONOU" : delta >= 3 ? "AJUSTAR" : "SUBSTITUIR";
        String texto = "O percentual de acerto " + sujeito + " em " + habTxt + " passou de " + fmt(antes) + " para " + fmt(depois)
                + " entre avaliações comparáveis (" + (delta >= 0 ? "+" : "") + String.format(Locale.forLanguageTag("pt-BR"), "%.1f", delta) + " p.p.). "
                + switch (decisao) {
                    case "FUNCIONOU" -> "A equipe avaliou que a estratégia contribuiu e deve ser mantida como referência.";
                    case "AJUSTAR" -> "Houve avanço modesto; a equipe decidiu ajustar a frequência e o tempo das atividades.";
                    default -> "Não houve avanço relevante; a equipe decidiu substituir a estratégia na próxima etapa.";
                } + " Associação temporal: outros fatores podem ter influenciado.";
        jdbc.update("UPDATE plano SET resultado_observado = ?, decisao_reavaliacao = ?, atualizado_em = ? WHERE id = ?",
                texto, decisao, Timestamp.valueOf(LocalDateTime.of(data, LocalTime.of(16, 0))), id);
        registro(id, "REAVALIACAO", data, texto, null, autor);
        historico(id, LocalDateTime.of(data, LocalTime.of(16, 0)), autor, "REAVALIACAO", "CONCLUIDO", "REAVALIADO", null,
                "Decisão: " + switch (decisao) { case "FUNCIONOU" -> "A estratégia funcionou"; case "AJUSTAR" -> "Precisa de ajustes"; default -> "Deve ser substituída"; });
    }

    private void acao(long plano, String desc, String resp, LocalDate data, String status, LocalDate concl) {
        jdbc.update("INSERT INTO plano_acao (plano_id, descricao, responsavel, data_prevista, status, concluida_em) VALUES (?,?,?,?,?,?)",
                plano, desc, resp, Date.valueOf(data), status, concl == null ? null : Date.valueOf(concl));
    }

    private void registro(long plano, String tipo, LocalDate data, String desc, String percepcao, String autor) {
        jdbc.update("INSERT INTO plano_registro (plano_id, tipo, data, descricao, percepcao, autor_id, criado_em) VALUES (?,?,?,?,?,?,?)",
                plano, tipo, Date.valueOf(data), desc, percepcao, autor, Timestamp.valueOf(LocalDateTime.of(data, LocalTime.of(18, 0))));
    }

    private void historico(long plano, LocalDateTime quando, String usuario, String tipo, String de, String para, String just, String alt) {
        jdbc.update("INSERT INTO plano_historico (plano_id, data_hora, usuario_id, tipo, status_de, status_para, justificativa, alteracoes) VALUES (?,?,?,?,?,?,?,?)",
                plano, Timestamp.valueOf(quando), usuario, tipo, de, para, just, alt);
    }

    // ------------------------------------------------------------------ utilidades

    private String[] estrategiaPara(String hab) {
        List<String[]> l = jdbc.query("""
                SELECT e.id, e.titulo FROM estrategia e JOIN estrategia_habilidade eh ON eh.estrategia_id = e.id
                 WHERE eh.habilidade_id = ? AND e.nivel IN ('TURMA','AMBOS') AND e.tipo <> 'REAVALIACAO' ORDER BY e.id""",
                (rs, i) -> new String[]{rs.getString(1), rs.getString(2)}, hab);
        return l.isEmpty() ? new String[]{null, "Atividades direcionadas à habilidade, com reavaliação ao final"} : l.get(0);
    }

    private static int baseIdx(LocalDate inicio) {
        int idx = 0;
        for (int i = 0; i < DATAS_AV.length; i++) if (!DATAS_AV[i].isAfter(inicio)) idx = i;
        return idx;
    }

    private static String sigla(int idx) {
        return "AV" + (idx + 1);
    }

    private String resultadoTxt(String est, String hab, int a) {
        int[] r = resultados.get(est + "|" + AVS[a] + "|" + hab);
        return r == null ? "sem resultado" : r[0] + " de " + r[1] + " itens (" + fmt(100.0 * r[0] / r[1]) + ")";
    }

    private Turma turmaPorId(String id) {
        return turmas.stream().filter(t -> t.id().equals(id)).findFirst().orElseThrow();
    }

    private Hab habPorId(String id) {
        return habs.stream().filter(h -> h.id().equals(id)).findFirst().orElseThrow();
    }

    private Estudante estudantePorNome(String turma, String nome) {
        return estudantes.stream().filter(e -> e.turmaId().equals(turma) && e.nome().equals(nome)).findFirst().orElseThrow();
    }

    static String fmt(Double v) {
        return v == null ? "—" : String.format(Locale.forLanguageTag("pt-BR"), "%.1f%%", v);
    }
}
