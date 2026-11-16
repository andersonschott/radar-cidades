using Radar.Sources.Siscam;

namespace Radar.Sources.Tests;

public sealed class SiscamParserTests
{
    private static readonly Uri Base = new("https://santabarbara.siscam.com.br/");

    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "siscam", "santa-barbara-doeste", name));

    [Fact]
    public void ParseCouncilors_ReadsAllCurrentWithPartyAndAliases()
    {
        var list = SiscamParser.ParseCouncilors(Fixture("vereadores.html"), Base);

        list.Count.ShouldBe(19);
        var dorigon = list.Single(c => c.Councilor.SourceId == "3881");
        dorigon.Councilor.Name.ShouldBe("CABO DORIGON");
        dorigon.Councilor.PartyAcronym.ShouldBe("PODEMOS");
        dorigon.Councilor.ProfileUrl.ShouldBe(new Uri(Base, "Vereadores/Vereador/3881"));
        dorigon.Aliases.ShouldContain("claudemir dorigon");
        list.Count(c => c.Councilor.PhotoUrl is null).ShouldBe(7);
    }

    [Fact]
    public void ParseExport_ReadsEveryItemAndMatchesHeaderCount()
    {
        var export = SiscamParser.ParseExport(Fixture("exportar-impressao-indicacao-2026-11.html"), Base);

        export.DeclaredCount.ShouldBe(158);
        export.Items.Count.ShouldBe(158);
        var first = export.Items[0];
        first.SourceId.ShouldBe("225840");
        first.RawType.ShouldBe("Indicação");
        (first.Number, first.Year).ShouldBe((5172, 2026));
        first.Date.ShouldBe(new DateOnly(2026, 11, 16));
        first.Status.ShouldBe("TRAMITANDO");
        first.Authors.ShouldBe(["CABO DORIGON"]);
        first.Summary.ShouldStartWith("Indica ao Poder Executivo Municipal manutenção na iluminação pública na Rua do Café");
        first.OfficialUrl.ShouldBe(new Uri(Base, "Documentos/Documento/225840"));
        export.Items.ShouldAllBe(i => i.Summary.Length > 0 && !i.Summary.Contains('\n', StringComparison.Ordinal));
    }

    [Fact]
    public void ParseExport_SplitsCoAuthorsAndDecodesEntities()
    {
        var export = SiscamParser.ParseExport(Fixture("exportar-impressao-autor-3881-2026-10.html"), Base);

        export.Items.Count.ShouldBe(export.DeclaredCount!.Value);
        export.Items.ShouldContain(i => i.Authors.Count > 1);
        export.Items.SelectMany(i => i.Authors).ShouldAllBe(a => !a.Contains('&', StringComparison.Ordinal) && a == a.Trim());
    }

    [Fact]
    public void ParseExport_EmptyPage_ReturnsNoItems() =>
        SiscamParser.ParseExport("<html><body><p class=\"text-center\">Documentos - 0 registro(s)</p></body></html>", Base)
            .ShouldBe(new SiscamExport(0, []), new SiscamExportComparer());

    private sealed class SiscamExportComparer : IEqualityComparer<SiscamExport>
    {
        public bool Equals(SiscamExport? x, SiscamExport? y) => x?.DeclaredCount == y?.DeclaredCount && x?.Items.Count == y?.Items.Count;

        public int GetHashCode(SiscamExport obj) => obj.Items.Count;
    }
}
