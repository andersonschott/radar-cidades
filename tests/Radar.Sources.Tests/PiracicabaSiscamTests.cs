using Radar.Domain;
using Radar.Sources.Siscam;

namespace Radar.Sources.Tests;

/// <summary>Piracicaba (siave.camarapiracicaba.sp.gov.br, SISCAM 8.8.1.91): o mesmo parser de SBO sobre fixtures reais de 16/11/2026.</summary>
public sealed class PiracicabaSiscamTests
{
    private static readonly Uri Base = new("https://siave.camarapiracicaba.sp.gov.br/");

    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "siscam", "piracicaba", name));

    private static Dictionary<string, string> Aliases() =>
        SiscamParser.ParseCouncilors(Fixture("vereadores.html"), Base)
            .SelectMany(c => c.Aliases.Select(a => (Alias: a, c.Councilor.SourceId)))
            .DistinctBy(a => a.Alias).ToDictionary(a => a.Alias, a => a.SourceId, StringComparer.Ordinal);

    [Fact]
    public void ParseCouncilors_Reads23_WithCivilNameAsDisplayName()
    {
        var list = SiscamParser.ParseCouncilors(Fixture("vereadores.html"), Base);

        list.Count.ShouldBe(23);
        // Em Piracicaba o h4 e o title da foto trazem o nome civil: "André Bandeira" (parlamentar) não aparece.
        var andre = list.Single(c => c.Councilor.SourceId == "648");
        andre.Councilor.Name.ShouldBe("André Gustavo Bandeira");
        andre.Aliases.ShouldBe(["andre gustavo bandeira"]);
    }

    [Fact]
    public void ParseExport_MatchesHeader_AndAuthorsResolveToCouncilors()
    {
        var export = SiscamParser.ParseExport(Fixture("exportar-impressao-indicacao-2026-11.html"), Base);

        export.DeclaredCount.ShouldBe(299);
        export.Items.Count.ShouldBe(299);
        export.Items[0].SourceId.ShouldBe("483727");
        (export.Items[0].Number, export.Items[0].Year).ShouldBe((5799, 2026));
        export.Items[0].RawType.ShouldBe("Indicação");

        var aliases = Aliases();
        var authors = export.Items.SelectMany(i => i.Authors).Select(TextFolding.Fold).ToList();
        var unknown = authors.Count(a => !aliases.ContainsKey(a));
        ((double)unknown / authors.Count).ShouldBeLessThan(0.05);
    }

    [Fact]
    public void ParseSessionList_ReadsFirstPage()
    {
        var list = SiscamParser.ParseSessionList(Fixture("sessoes-pesquisa-p1.html"), Base);

        list.DeclaredCount.ShouldBe(209);
        list.Items.Count.ShouldBe(15);
        list.Items[0].ShouldBe(new SourceSessionRef("4414", "65ª Sessão Ordinária de 2026", new DateOnly(2026, 11, 16), new Uri(Base, "Sessoes/Sessao/4414")));
    }

    [Fact]
    public void ParseRollCall_ReadsPresentAndAbsent()
    {
        var call = SiscamParser.ParseRollCall(Fixture("sessao-4239-frequencias.html"));

        call.Calls.ShouldBeGreaterThan(0);
        call.Present.Count.ShouldBe(20);
        call.Absent.ShouldBe(["alessandra bellucci", "marco antonio da fonseca bicheiro", "paulo henrique paranhos ribeiro"], ignoreOrder: true);
        call.CountMismatch.ShouldBeFalse();
        // Cássio Luiz Barbosa votou em 2025 e não está nos 23 de /vereadores (suplente que saiu): o source o deixa de fora e loga.
        call.Present.ShouldContain("cassio luiz barbosa");
        Aliases().ShouldNotContainKey("cassio luiz barbosa");
    }

    [Theory]
    [InlineData("/vereadores")]
    [InlineData("/Documentos/Exportar")]
    [InlineData("/Sessoes/Pesquisa")]
    [InlineData("/Sessoes/Sessao/1")]
    public void Robots_FirstStarGroupAllows(string path) =>
        // O bloco gerenciado da Cloudflare ("*" + Allow: /) vem antes do "*" + Disallow: / do SISCAM (ADR 0004).
        RobotsTxt.IsAllowed(Fixture("robots.txt"), SiscamSource.AgentToken, path).ShouldBeTrue();
}
