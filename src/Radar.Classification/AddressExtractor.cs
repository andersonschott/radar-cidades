using System.Text.RegularExpressions;

namespace Radar.Classification;

public sealed record ExtractedLocation(
    string? StreetRaw,
    string? StreetNormalized,
    string? NeighborhoodRaw,
    string? NeighborhoodNormalized);

/// <summary>Extração de logradouro e bairro do texto de uma proposição (SDD §7.2). Puro e determinístico.</summary>
public static partial class AddressExtractor
{
    // O nome termina em pontuação, fim de frase ou numa palavra de ligação ("no bairro", "esquina", " e ").
    // Ponto depois de inicial ("G.") ou abreviação ("Jd.", "Dr.") não encerra o nome.
    private const string Period =
        @"(?<!(?:^|[\s.])(?:\p{L}|Jd|Vl|Pq|Res|Dr|Dra|Prof|Profa|Sta?|Sr|Pe|Cel|Eng|Ver|Gal|Cap|Ten|Av|Tv|Al|P[çc]a))\.(?:\s|$)";

    private const string Name =
        @"[\p{L}\p{N}][\p{L}\p{N}\s'\-º°.]*?(?=\s*(?:[,;:()]|\s-\s|" + Period + @"|$)|\s+(?:e|no|na|nos|nas|em|bairro|esquina|pr[oó]ximo|altura|entre|defronte|frente|n[º°o]\.?)\b)";

    [GeneratedRegex(
        @"(?<![\p{L}])(?:Rua|R\.|Avenida|Av\.?|Travessa|Tv\.|Alameda|Al\.|Pra[çc]a|P[çc]a\.?|Estrada|Rodovia|Viela|Largo)\s+" + Name,
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 1000)]
    private static partial Regex StreetRegex();

    [GeneratedRegex(
        @"\bbairro\s+(?<raw>" + Name + @")|(?<![\p{L}])(?<raw>(?:Jardim|Jd\.?|Vila|Vl\.?|Parque|Pq\.?|Residencial|Res\.|Conjunto|Ch[aá]cara|N[uú]cleo)\s+" + Name + ")",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 1000)]
    private static partial Regex NeighborhoodRegex();

    public static IReadOnlyList<ExtractedLocation> Extract(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        var streets = StreetRegex().Matches(text);

        // Bairro dentro do nome de uma rua ("Rua Vila Rica") não conta.
        var neighborhood = NeighborhoodRegex().Matches(text)
            .FirstOrDefault(n => !streets.Any(s => n.Index >= s.Index && n.Index < s.Index + s.Length));
        var neighborhoodRaw = neighborhood?.Groups["raw"].Value.Trim();
        var neighborhoodNormalized = neighborhoodRaw is null ? null : TextNormalizer.Normalize(neighborhoodRaw);

        if (streets.Count == 0)
        {
            return neighborhoodRaw is null ? [] : [new ExtractedLocation(null, null, neighborhoodRaw, neighborhoodNormalized)];
        }

        return [.. streets.Select(s => new ExtractedLocation(
            s.Value.Trim(), TextNormalizer.Normalize(s.Value), neighborhoodRaw, neighborhoodNormalized))];
    }
}
