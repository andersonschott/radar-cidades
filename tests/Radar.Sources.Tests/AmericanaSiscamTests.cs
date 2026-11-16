using Radar.Domain;
using Radar.Sources.Siscam;

namespace Radar.Sources.Tests;

/// <summary>Mesmo parser de SBO sobre páginas reais de Americana (docs/sources/siscam-americana.md).</summary>
public sealed class AmericanaSiscamTests
{
    private static readonly Uri Base = new("https://americana.siscam.com.br/");

    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "siscam", "americana", name));

    [Fact]
    public void ParseCouncilors_ReadsAllNineteen()
    {
        var list = SiscamParser.ParseCouncilors(Fixture("vereadores.html"), Base);

        list.Count.ShouldBe(19);
        var gutao = list.Single(c => c.Councilor.SourceId == "3163");
        gutao.Councilor.Name.ShouldBe("GUTÃO DO LANCHE");
        gutao.Councilor.PartyAcronym.ShouldBe("AGIR");
        gutao.Aliases.ShouldContain("antonio augusto da silva martins bueno");
        list.ShouldAllBe(c => c.Councilor.PhotoUrl != null);
    }

    [Fact]
    public void ParseExport_MatchesHeaderAndAuthorsMapToCouncilors()
    {
        var aliases = SiscamParser.ParseCouncilors(Fixture("vereadores.html"), Base)
            .SelectMany(c => c.Aliases.Select(a => (Alias: a, c.Councilor.SourceId)))
            .ToDictionary(a => a.Alias, a => a.SourceId, StringComparer.Ordinal);

        var export = SiscamParser.ParseExport(Fixture("exportar-impressao-indicacao-2026-11-10a11.html"), Base);

        export.DeclaredCount.ShouldBe(140);
        export.Items.Count.ShouldBe(140);
        var first = export.Items[0];
        first.SourceId.ShouldBe("498225");
        first.RawType.ShouldBe("Indicação");
        (first.Number, first.Year).ShouldBe((15881, 2026));
        first.Date.ShouldBe(new DateOnly(2026, 11, 11));
        first.Authors.ShouldBe(["LUCAS LEONCINE"]);

        var authors = export.Items.SelectMany(i => i.Authors).ToList();
        var unknown = authors.Count(a => !aliases.ContainsKey(TextFolding.Fold(a)));
        ((double)unknown / authors.Count).ShouldBeLessThan(0.05);
    }

    [Fact]
    public void ParseSessionList_ReadsPageAndDeclaredTotal()
    {
        var list = SiscamParser.ParseSessionList(Fixture("sessoes-pesquisa-p1.html"), Base);

        list.DeclaredCount.ShouldBe(100);
        list.Items.Count.ShouldBe(15);
        list.Items[0].ShouldBe(new SourceSessionRef("1713", "41ª Sessão Ordinária de 2026", new DateOnly(2026, 11, 10), new Uri(Base, "Sessoes/Sessao/1713")));
    }

    [Fact]
    public void ParseRollCall_SeparatesPresentAndAbsent()
    {
        // Nas votações da 1713 há um 3º "Ausente" (Leonora Périco); só a chamada conta.
        var call = SiscamParser.ParseRollCall(Fixture("sessao-1713-ausencia.html"));

        call.Calls.ShouldBe(1);
        call.Present.Count.ShouldBe(17);
        call.Present.ShouldContain("leonora perico");
        call.Absent.ShouldBe(["jacira chavare", "juninho dias"], ignoreOrder: true);
        call.CountMismatch.ShouldBeFalse();
    }
}
