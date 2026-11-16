using Radar.Classification;

namespace Radar.Classification.Tests;

public sealed class TextNormalizerTests
{
    [Theory]
    [InlineData("  Jd.  São   Fernando ", "jardim sao fernando")]
    [InlineData("Av Brasil", "avenida brasil")]
    [InlineData("Vl. Grego", "vila grego")]
    [InlineData("Pq. das Nações", "parque das nacoes")]
    [InlineData("Pça. da Matriz", "praca da matriz")]
    [InlineData("R. XV de Novembro", "rua xv de novembro")]
    [InlineData("Res. Furlan", "residencial furlan")]
    [InlineData("Ação", "acao")]
    public void Normalize_RemovesAccentsAndExpandsAbbreviations(string input, string expected) =>
        TextNormalizer.Normalize(input).ShouldBe(expected);
}
