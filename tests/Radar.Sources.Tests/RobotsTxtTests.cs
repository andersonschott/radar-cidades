namespace Radar.Sources.Tests;

public sealed class RobotsTxtTests
{
    [Theory]
    [InlineData("", "/vereadores", true)]
    [InlineData("User-agent: *\nDisallow: /", "/vereadores", false)]
    [InlineData("User-agent: *\nDisallow: /Documentos\nAllow: /Documentos/Exportar", "/Documentos/Exportar", true)]
    [InlineData("User-agent: *\nDisallow: /Documentos", "/Documentos/Pesquisa", false)]
    [InlineData("User-agent: RadarCidades\nAllow: /\n\nUser-agent: *\nDisallow: /", "/vereadores", true)]
    [InlineData("User-agent: Googlebot\nAllow: /", "/vereadores", true)]
    [InlineData("User-agent: *\nDisallow:", "/x", true)]
    public void IsAllowed(string robots, string path, bool expected) =>
        RobotsTxt.IsAllowed(robots, "RadarCidades", path).ShouldBe(expected);
}

public sealed class RobotsTxtRealSiscamTests
{
    // robots.txt real de santabarbara.siscam.com.br (16/11/2026): libera só buscadores nomeados; "*" tem Disallow: /.
    [Theory]
    [InlineData("/vereadores")]
    [InlineData("/Documentos/Exportar")]
    public void SantaBarbara_DisallowsUs(string path) =>
        RobotsTxt.IsAllowed(
            File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "siscam", "santa-barbara-doeste", "robots.txt")),
            "RadarCidades", path).ShouldBeFalse();
}
