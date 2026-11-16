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
