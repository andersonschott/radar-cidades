using Radar.Domain;

namespace Radar.Domain.Tests;

public sealed class CityConfigLoaderTests
{
    private static string CitiesDir => Path.Combine(AppContext.BaseDirectory, "cities");

    [Fact]
    public void LoadAll_ReadsSantaBarbaraConfig()
    {
        var sbo = CityConfigLoader.LoadAll(CitiesDir).Single(c => c.Slug == "santa-barbara-doeste");

        sbo.Name.ShouldBe("Santa Bárbara d'Oeste");
        sbo.Source.ShouldBe(SourceSystem.Siscam);
        sbo.TermStart.ShouldBe(new DateOnly(2025, 1, 1));
        sbo.BaseUrl.ShouldBe(new Uri("https://santabarbara.siscam.com.br/"));
        sbo.Capabilities.ShouldContain("propositions");
        sbo.Active.ShouldBeTrue();
        sbo.Siscam!.SearchIndex.ShouldBe(74);
        sbo.LocalCollection.ShouldBeFalse();
        CityConfigLoader.LoadAll(CitiesDir).Single(c => c.Slug == "piracicaba").LocalCollection.ShouldBeTrue();
        sbo.Siscam.DocumentTypes[PropositionType.Indicacao].ShouldBe(123);
    }

    [Fact]
    public void LoadAll_ReadsAmericanaConfig()
    {
        var am = CityConfigLoader.LoadAll(CitiesDir).Single(c => c.Slug == "americana");

        am.BaseUrl.ShouldBe(new Uri("https://americana.siscam.com.br/"));
        (am.MonthlySalary, am.PresidentSalary).ShouldBe((10305.64m, 11283.75m));
        am.RobotsOverride.ShouldBe("docs/adr/0003-coleta-siscam-americana-apesar-do-robots.md");
        am.Siscam!.DocumentTypes[PropositionType.Indicacao].ShouldBe(125);
    }

    [Fact]
    public void LoadAll_EverySiscamCityMapsAllEightTypes()
    {
        PropositionType[] expected = [PropositionType.Indicacao, PropositionType.Requerimento, PropositionType.Mocao, PropositionType.ProjetoLei,
            PropositionType.ProjetoLeiComplementar, PropositionType.ProjetoDecretoLegislativo, PropositionType.ProjetoResolucao, PropositionType.Outro];

        foreach (var city in CityConfigLoader.LoadAll(CitiesDir).Where(c => c.Source == SourceSystem.Siscam))
        {
            city.Siscam.ShouldNotBeNull($"{city.Slug} sem bloco siscam");
            city.Siscam.DocumentTypes.Keys.ShouldBe(expected, ignoreOrder: true, $"{city.Slug}: tipos do SISCAM incompletos");
            city.Siscam.DocumentTypes.Values.ShouldBeUnique($"{city.Slug}: código repetido");
        }
    }

    [Fact]
    public void LoadAll_IgnoresAuxiliaryFiles()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        File.Copy(Path.Combine(CitiesDir, "santa-barbara-doeste.json"), Path.Combine(dir, "santa-barbara-doeste.json"));
        File.WriteAllText(Path.Combine(dir, "santa-barbara-doeste.neighborhoods.json"), "[]");

        CityConfigLoader.LoadAll(dir).Count.ShouldBe(1);
    }

    [Fact]
    public void Parse_NullJson_Throws() =>
        Should.Throw<InvalidDataException>(() => CityConfigLoader.Parse("null"));
}
