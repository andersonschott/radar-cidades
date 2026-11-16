using Radar.Domain;

namespace Radar.Classification;

public static class TextNormalizer
{
    // SDD §7.2: abreviações de logradouro e bairro expandidas para agrupar variações.
    private static readonly Dictionary<string, string> Abbreviations = new(StringComparer.Ordinal)
    {
        ["r"] = "rua",
        ["av"] = "avenida",
        ["tv"] = "travessa",
        ["al"] = "alameda",
        ["pca"] = "praca",
        ["jd"] = "jardim",
        ["vl"] = "vila",
        ["pq"] = "parque",
        ["res"] = "residencial",
    };

    /// <summary>Sem acento, caixa baixa, espaços colapsados.</summary>
    public static string Fold(string text) => TextFolding.Fold(text);

    /// <summary><see cref="Fold"/> mais expansão de abreviações (<c>jd.</c> → <c>jardim</c>).</summary>
    public static string Normalize(string text) =>
        string.Join(' ', Fold(text).Split(' ').Select(token =>
        {
            var bare = token.TrimEnd('.');
            return Abbreviations.TryGetValue(bare, out var full) ? full : bare;
        }));
}
