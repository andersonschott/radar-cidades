using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Radar.Domain;
using Radar.Sources.Siscam;

namespace Radar.Sources.Tests;

public sealed class SiscamSourceTests
{
    private static readonly CityConfig City = new("santa-barbara-doeste", "Santa Bárbara d'Oeste", "SP", 3545803, SourceSystem.Siscam,
        new Uri("https://santabarbara.siscam.com.br/"), 19, 0m, new Uri("https://example.org/"), new DateOnly(2025, 1, 1), true, ["councilors", "propositions"]);

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
        await foreach (var p in source.GetPropositionsAsync(City, new DateOnly(2026, 11, 1), CancellationToken.None))
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
    public async Task GetCouncilors_AbortsWhenRobotsDisallows()
    {
        using var handler = new FakeHandler(uri => uri.AbsolutePath == "/robots.txt" ? "User-agent: *\nDisallow: /" : "");
        var source = new SiscamSource(new SingleClientFactory(handler), TimeProvider.System, NullLogger<SiscamSource>.Instance);

        await Should.ThrowAsync<InvalidOperationException>(() => source.GetCouncilorsAsync(City, CancellationToken.None));
        handler.Requests.ShouldNotContain(u => u.AbsolutePath == "/vereadores");
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
