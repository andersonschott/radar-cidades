using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Radar.Domain;
using Radar.Sources.Siscam;

namespace Radar.Sources.Tests;

public sealed class SiscamSourceTests
{
    private static readonly CityConfig City = new("santa-barbara-doeste", "Santa Bárbara d'Oeste", "SP", 3545803, SourceSystem.Siscam,
        new Uri("https://santabarbara.siscam.com.br/"), 19, 0m, new Uri("https://example.org/"), new DateOnly(2025, 1, 1), true, ["councilors", "propositions"],
        Siscam: new SiscamConfig(74, new Dictionary<PropositionType, int>
        {
            [PropositionType.Indicacao] = 123, [PropositionType.Requerimento] = 122, [PropositionType.Mocao] = 124, [PropositionType.ProjetoLei] = 117,
            [PropositionType.ProjetoLeiComplementar] = 118, [PropositionType.ProjetoDecretoLegislativo] = 119, [PropositionType.ProjetoResolucao] = 120, [PropositionType.Outro] = 121,
        }));

    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "siscam", "santa-barbara-doeste", name));

    [Fact]
    public void MonthlyWindows_CoversRangeAndOpensTheLast()
    {
        var windows = SiscamSource.MonthlyWindows(new DateOnly(2026, 9, 24), new DateOnly(2026, 11, 16)).ToList();

        windows.ShouldBe([
            (new DateOnly(2026, 9, 24), new DateOnly(2026, 9, 30)),
            (new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31)),
            (new DateOnly(2026, 11, 1), new DateOnly(2099, 12, 31)),
        ]);
    }

    [Fact]
    public async Task GetPropositions_MapsAuthorsByAliasAndRequestsEveryType()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath switch
        {
            "/robots.txt" => "User-agent: *\nAllow: /",
            "/vereadores" => Fixture("vereadores.html"),
            _ when uri.Query.Contains("Documento=123", StringComparison.Ordinal) => Fixture("exportar-impressao-indicacao-2026-11.html"),
            _ => "<html><body><p class=\"text-center\">0 registro(s)</p></body></html>",
        });
        var source = new SiscamSource(new SingleClientFactory(handler), new FakeTimeProvider(new DateTimeOffset(2026, 11, 16, 12, 0, 0, TimeSpan.Zero)), NullLogger<SiscamSource>.Instance);

        var items = new List<SourceProposition>();
        await foreach (var p in source.GetPropositionsAsync(City, new DateOnly(2026, 11, 1), null, CancellationToken.None))
        {
            items.Add(p);
        }

        items.Count.ShouldBe(158);
        items[0].AuthorSourceIds.ShouldBe(["3881"]);
        items.Count(p => p.AuthorSourceIds.Count == 0).ShouldBeLessThan(5);
        handler.Requests.Count(u => u.AbsolutePath == "/Documentos/Exportar").ShouldBe(8);
        handler.Requests.ShouldAllBe(u => !u.Query.Contains("DataFinal=16/11/2026", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetPropositions_WithTypes_RequestsOnlyThoseTypes()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath switch
        {
            "/robots.txt" => "User-agent: *\nAllow: /",
            "/vereadores" => Fixture("vereadores.html"),
            _ => "<html><body><p class=\"text-center\">0 registro(s)</p></body></html>",
        });
        var source = new SiscamSource(new SingleClientFactory(handler), new FakeTimeProvider(new DateTimeOffset(2026, 11, 16, 12, 0, 0, TimeSpan.Zero)), NullLogger<SiscamSource>.Instance);

        await foreach (var _ in source.GetPropositionsAsync(City, new DateOnly(2026, 10, 1), [PropositionType.ProjetoLei, PropositionType.ProjetoLeiComplementar], CancellationToken.None))
        {
        }

        var exports = handler.Requests.Where(u => u.AbsolutePath == "/Documentos/Exportar").ToList();
        exports.Count.ShouldBe(4);
        exports.ShouldAllBe(u => u.Query.Contains("Documento=117", StringComparison.Ordinal) || u.Query.Contains("Documento=118", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GetPropositions_UsesSearchIndexAndCodesFromConfig()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath switch
        {
            "/robots.txt" => "User-agent: *\nAllow: /",
            "/vereadores" => Fixture("vereadores.html"),
            _ => "<html><body><p class=\"text-center\">0 registro(s)</p></body></html>",
        });
        var source = new SiscamSource(new SingleClientFactory(handler), new FakeTimeProvider(new DateTimeOffset(2026, 11, 16, 12, 0, 0, TimeSpan.Zero)), NullLogger<SiscamSource>.Instance);
        var other = City with { Siscam = new SiscamConfig(78, new Dictionary<PropositionType, int> { [PropositionType.Indicacao] = 135 }) };

        await foreach (var _ in source.GetPropositionsAsync(other, new DateOnly(2026, 11, 1), null, CancellationToken.None))
        {
        }

        handler.Requests.Where(u => u.AbsolutePath == "/Documentos/Exportar")
            .ShouldHaveSingleItem().Query.ShouldContain("id=78&Modulo=8&pagina=1&Documento=135");
    }

    [Fact]
    public async Task GetCouncilors_AbortsWhenRobotsDisallows()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath == "/robots.txt" ? "User-agent: *\nDisallow: /" : "");
        var source = new SiscamSource(new SingleClientFactory(handler), TimeProvider.System, NullLogger<SiscamSource>.Instance);

        await Should.ThrowAsync<InvalidOperationException>(() => source.GetCouncilorsAsync(City, CancellationToken.None));
        handler.Requests.ShouldNotContain(u => u.AbsolutePath == "/vereadores");
    }

    [Fact]
    public async Task ListSessions_PagesUntilDeclaredTotal()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath switch
        {
            "/robots.txt" => "User-agent: *\nAllow: /",
            "/vereadores" => Fixture("vereadores.html"),
            _ when uri.Query.Contains("pagina=7", StringComparison.Ordinal) => Fixture("sessoes-pesquisa-p7.html"),
            _ => Fixture("sessoes-pesquisa-p1.html"),
        });
        var source = new SiscamSource(new SingleClientFactory(handler), new FakeTimeProvider(new DateTimeOffset(2026, 11, 16, 12, 0, 0, TimeSpan.Zero)), NullLogger<SiscamSource>.Instance);

        var sessions = await source.ListSessionsAsync(City, new DateOnly(2025, 1, 1), CancellationToken.None);

        handler.Requests.Count(u => u.AbsolutePath == "/Sessoes/Pesquisa").ShouldBe(7);
        sessions[^1].SourceId.ShouldBe("821");
        sessions.Select(s => s.SourceId).ShouldBeUnique();
    }

    [Fact]
    public async Task GetSession_MapsRollCallNamesToCouncilorIds()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath switch
        {
            "/robots.txt" => "User-agent: *\nAllow: /",
            "/vereadores" => Fixture("vereadores.html"),
            _ => Fixture("sessao-840-ausencia.html"),
        });
        var source = new SiscamSource(new SingleClientFactory(handler), TimeProvider.System, NullLogger<SiscamSource>.Instance);
        var session = new SourceSessionRef("840", "16ª Sessão Ordinária de 2025", new DateOnly(2025, 5, 6), new Uri("https://santabarbara.siscam.com.br/Sessoes/Sessao/840"));

        var result = await source.GetSessionAsync(City, session, CancellationToken.None);

        result.HasRollCall.ShouldBeTrue();
        result.AbsentIds.ShouldBe(["3546"]);
        result.PresentIds.Count.ShouldBeGreaterThanOrEqualTo(17);
        handler.Requests.Count(u => u.AbsolutePath == "/vereadores").ShouldBe(1);
    }

    private sealed class FakeHandler(Func<Uri, string> respond) : HttpMessageHandler
    {
        public List<Uri> Requests { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request.RequestUri!);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(respond(request.RequestUri!)) });
        }
    }

    private sealed class SingleClientFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}

public sealed class SiscamSourceOverrideTests
{
    [Fact]
    public async Task GetCouncilors_WithRecordedOverride_SkipsRobots()
    {
        var city = new CityConfig("sbo", "SBO", "SP", 1, SourceSystem.Siscam, new Uri("https://x.example/"), 19, 0m,
            new Uri("https://x.example/"), new DateOnly(2025, 1, 1), true, [], RobotsOverride: "docs/adr/0002.md");
        using var handler = new RecordingHandler();
        var source = new SiscamSource(new Factory(handler), TimeProvider.System, NullLogger<SiscamSource>.Instance);

        await source.GetCouncilorsAsync(city, CancellationToken.None);

        handler.Paths.ShouldBe(["/vereadores"]);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public List<string> Paths { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Paths.Add(request.RequestUri!.AbsolutePath);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("<html></html>") });
        }
    }

    private sealed class Factory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
}
