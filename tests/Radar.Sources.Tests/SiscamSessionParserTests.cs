using Radar.Sources.Siscam;
using Shouldly;

namespace Radar.Sources.Tests;

public sealed class SiscamSessionParserTests
{
    private static readonly Uri Base = new("https://santabarbara.siscam.com.br/");

    private static string Fixture(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "siscam", "santa-barbara-doeste", name));

    [Fact]
    public void ParseSessionList_ReadsPageAndDeclaredTotal()
    {
        var list = SiscamParser.ParseSessionList(Fixture("sessoes-pesquisa-p1.html"), Base);

        list.DeclaredCount.ShouldBe(105);
        list.Items.Count.ShouldBe(15);
        var first = list.Items[0];
        first.SourceId.ShouldBe("931");
        first.Name.ShouldBe("41ª Sessão Ordinária de 2026");
        first.Date.ShouldBe(new DateOnly(2026, 11, 10));
        first.OfficialUrl.ShouldBe(new Uri(Base, "Sessoes/Sessao/931"));
    }

    [Fact]
    public void ParseSessionList_LastPageEndsAtInauguralSession() =>
        SiscamParser.ParseSessionList(Fixture("sessoes-pesquisa-p7.html"), Base).Items[^1]
            .ShouldBe(new Domain.SourceSessionRef("821", "1ª Sessão Eleição Mesa Diretora de 2025", new DateOnly(2025, 1, 1), new Uri(Base, "Sessoes/Sessao/821")));

    [Fact]
    public void ParseRollCall_SeparatesPresentAndAbsent_FoldedNames()
    {
        var call = SiscamParser.ParseRollCall(Fixture("sessao-840-ausencia.html"));

        call.Calls.ShouldBe(2);
        call.Present.Count.ShouldBe(18);
        call.Present.ShouldContain("celso avila");
        call.Absent.ShouldBe(["esther moraes"]);
        call.CountMismatch.ShouldBeFalse();
    }

    [Fact]
    public void ParseRollCall_IgnoresVoteGroups()
    {
        // A 927 tem "Ausente (n)" nas votações; só a chamada conta.
        var call = SiscamParser.ParseRollCall(Fixture("sessao-927-votacoes.html"));

        call.Present.Count.ShouldBe(19);
        call.Absent.ShouldBeEmpty();
    }

    [Fact]
    public void ParseRollCall_PresentInAnyCallIsPresent()
    {
        const string html = """
            <h3><strong>Frequências</strong></h3>
            <div class="data-list">
              <div class="data-list-item"><h4>Chamada Regimental - 14:00</h4><div>
                <p><strong>Presentes (1)</strong> - ANA</p><p><strong>Ausentes (1)</strong> - BETO</p></div></div>
              <div class="data-list-item"><h4>Chamada Regimental - 16:00</h4><div>
                <p><strong>Presentes (2)</strong> - ANA, BETO</p></div></div>
            </div>
            """;

        var call = SiscamParser.ParseRollCall(html);

        call.Present.ShouldBe(["ana", "beto"], ignoreOrder: true);
        call.Absent.ShouldBeEmpty();
    }

    [Fact]
    public void ParseRollCall_NoFrequencies_ReturnsZeroCalls() =>
        SiscamParser.ParseRollCall("<html><body><h3>Votações</h3></body></html>").Calls.ShouldBe(0);
}
