using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using Radar.Data;
using Radar.Domain;

namespace Radar.Publishing;

/// <summary>Monta os arquivos JSON públicos de uma cidade (SDD §9). Puro: não faz I/O.</summary>
public static class PublicationBuilder
{
    public const int SchemaVersion = 1;

    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        // Mantém acentos legíveis e continua escapando caracteres sensíveis a HTML.
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
        Converters = { new JsonStringEnumConverter() },
    };

    /// <summary><c>places.json</c> a partir de <c>cities/{slug}.neighborhoods.json</c> (gerado por <c>tools/geo</c>): só bairros com posição.</summary>
    public static byte[] Places(string neighborhoodsJson, string slug, DateTimeOffset generatedAt)
    {
        using var doc = JsonDocument.Parse(neighborhoodsJson);
        var root = doc.RootElement;
        var places = new List<PlaceDto>();
        foreach (var hood in root.GetProperty("neighborhoods").EnumerateObject())
        {
            var e = hood.Value;
            if (!e.TryGetProperty("match", out var match) || match.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            var byStreets = match.GetProperty("category").GetString() == "streets";
            var label = e.TryGetProperty("label", out var l) ? l.GetString()! : hood.Name;
            places.Add(new PlaceDto(
                byStreets ? label : match.GetProperty("name").GetString()!,
                e.TryGetProperty("search", out var s) ? s.GetString()! : label,
                Math.Round(match.GetProperty("lat").GetDouble(), 5),
                Math.Round(match.GetProperty("lon").GetDouble(), 5),
                byStreets ? "ruas" : "osm",
                [.. e.GetProperty("names").EnumerateArray().Select(n => n.GetString()!)]));
        }

        return Serialize(new Envelope<PlacesDto>(SchemaVersion, generatedAt, slug,
            new PlacesDto(root.GetProperty("license").GetString()!, [.. places.OrderBy(p => p.Label, StringComparer.Ordinal)])));
    }

    public static byte[] CitiesIndex(IEnumerable<CitySummaryDto> cities, DateTimeOffset generatedAt) =>
        Serialize(new Envelope<IReadOnlyList<CitySummaryDto>>(SchemaVersion, generatedAt, null, [.. cities.OrderBy(c => c.Slug, StringComparer.Ordinal)]));

    /// <summary>Caminho relativo à pasta da cidade (ex.: <c>councilors/ana.json</c>) → conteúdo.</summary>
    public static IReadOnlyDictionary<string, byte[]> CityFiles(CityPublicationData data, DateTimeOffset generatedAt)
    {
        ArgumentNullException.ThrowIfNull(data);
        var slug = data.City.Slug;
        var bySlug = data.Councilors.ToDictionary(c => c.Id, c => c.Slug);
        var councilors = data.Councilors
            .Select(c => (Entity: c, Dto: ToDto(c, data.Propositions.Where(p => p.Authors.Any(a => a.Id == c.Id)).ToList(), Attendance(c, data.Sessions))))
            .ToList();

        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal)
        {
            ["meta.json"] = Serialize(new Envelope<MetaDto>(SchemaVersion, generatedAt, slug, new MetaDto(
                data.City.Name, data.City.Uf, data.City.Seats, data.City.MonthlySalary, data.City.SalarySourceUrl,
                data.City.TermStart, data.City.BaseUrl, data.LastSuccessfulScrape, data.Capabilities,
                data.Councilors.Count, Totals(data.Propositions), data.City.SalaryFrom, data.Sessions.Count(s => s.HasRollCall), data.AccentColor,
                data.PresidentSalary, data.ThirteenthSalary, data.SalarySourceLabel))),
            ["councilors.json"] = Serialize(new Envelope<IReadOnlyList<CouncilorDto>>(SchemaVersion, generatedAt, slug, [.. councilors.Select(c => c.Dto)])),
            ["requests.json"] = Serialize(new Envelope<IReadOnlyList<RequestDto>>(SchemaVersion, generatedAt, slug,
                [.. data.Propositions.Where(p => p.Category == PropositionCategory.PedidoBairro).Select(p => ToRequest(p, bySlug))])),
        };

        foreach (var (entity, dto) in councilors)
        {
            var propositions = data.Propositions.Where(p => p.Authors.Any(a => a.Id == entity.Id)).Select(ToDto).ToList();
            files[$"councilors/{dto.Slug}.json"] = Serialize(new Envelope<CouncilorProfileDto>(SchemaVersion, generatedAt, slug, new CouncilorProfileDto(dto, propositions)));
        }

        return files;
    }

    private static CouncilorDto ToDto(Councilor c, IReadOnlyList<Proposition> authored, AttendanceDto? attendance) =>
        new(c.Slug, c.Name, c.Mandates.OrderByDescending(m => m.Start).FirstOrDefault()?.Party?.Acronym, c.PhotoUrl, c.ProfileUrl, Totals(authored), attendance);

    // Denominador por vereador: só as sessões em que ele foi chamado (mandato parcial e suplência não contam como ausência).
    private static AttendanceDto? Attendance(Councilor c, IReadOnlyList<Session> sessions)
    {
        var calls = sessions.Where(s => s.HasRollCall).SelectMany(s => s.Attendances).Where(a => a.CouncilorId == c.Id).ToList();
        return calls.Count == 0 ? null : new AttendanceDto(calls.Count, calls.Count(a => a.Present), calls.Count(a => !a.Present));
    }

    private static TotalsDto Totals(IReadOnlyCollection<Proposition> propositions) => new(
        propositions.Count,
        propositions.Count(p => p.Category == PropositionCategory.PedidoBairro),
        propositions.GroupBy(p => p.Type.ToString()).OrderBy(g => g.Key, StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.Ordinal),
        Bills(propositions));

    private static BillsDto Bills(IReadOnlyCollection<Proposition> propositions)
    {
        var stages = propositions.Where(p => p.Type is PropositionType.ProjetoLei or PropositionType.ProjetoLeiComplementar)
            .Select(p => BillStage(p.Status)).ToList();
        return new BillsDto(stages.Count, stages.Count(s => s == "approved"), stages.Count(s => s == "progress"), stages.Count(s => s == "withdrawn"), stages.Count(s => s == "other"));
    }

    // Texto livre da fonte ("Aprovado", "TRAMITANDO", "PEDIDO DE PARECER - SUSPENSO O TRÂMITE", "RETIRADO PELO AUTOR", "REJEITADO"…).
    private static string BillStage(string? status)
    {
        var s = TextFolding.Fold(status ?? string.Empty);
        return s.Contains("aprovad", StringComparison.Ordinal) ? "approved"
            : s.Contains("retirad", StringComparison.Ordinal) ? "withdrawn"
            : s.Contains("tramit", StringComparison.Ordinal) ? "progress"
            : "other";
    }

    private static PropositionDto ToDto(Proposition p) =>
        new(p.SourceId, p.Type.ToString(), p.RawType, p.Number, p.Year, p.PresentedOn, p.Summary, p.Category.ToString(), p.OfficialUrl, p.Status);

    private static RequestDto ToRequest(Proposition p, Dictionary<int, string> slugs) => new(
        p.SourceId, p.Type.ToString(), p.Number, p.Year, p.PresentedOn, p.Summary, p.OfficialUrl,
        [.. p.Authors.Select(a => slugs[a.Id]).Order(StringComparer.Ordinal)],
        [.. p.Locations.Select(l => l.StreetNormalized).OfType<string>().Distinct(StringComparer.Ordinal)],
        [.. p.Locations.Select(l => l.NeighborhoodNormalized).OfType<string>().Distinct(StringComparer.Ordinal)]);

    private static byte[] Serialize<T>(T value) => JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions);
}
