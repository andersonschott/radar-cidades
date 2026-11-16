using System.Text.Json.Serialization;

namespace Radar.Publishing;

// Contrato JSON público (SDD §9). Mudança incompatível = SchemaVersion + 1.

public sealed record Envelope<T>(
    int SchemaVersion,
    DateTimeOffset GeneratedAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? City,
    T Data);

public sealed record CitySummaryDto(string Slug, string Name, string Uf, IReadOnlyList<string> Capabilities, DateTimeOffset? LastUpdated);

/// <summary>Projetos de lei (comum e complementar) pela situação na Câmara. Aprovado = votado pela Câmara; a sanção do prefeito não está na fonte.</summary>
public sealed record BillsDto(int Total, int Approved, int InProgress, int Withdrawn, int Other);

public sealed record TotalsDto(int Propositions, int NeighborhoodRequests, IReadOnlyDictionary<string, int> ByType, BillsDto Bills);

public sealed record MetaDto(
    string Name,
    string Uf,
    int Seats,
    decimal MonthlySalary,
    Uri SalarySourceUrl,
    DateOnly TermStart,
    Uri OfficialUrl,
    DateTimeOffset? LastSuccessfulScrape,
    IReadOnlyList<string> Capabilities,
    int Councilors,
    TotalsDto Totals,
    DateOnly? SalaryFrom,
    int Sessions,
    string? AccentColor,
    decimal? PresidentSalary,
    bool ThirteenthSalary,
    string? SalarySourceLabel);

/// <summary>Posição aproximada de um bairro para o mapa. <c>Aliases</c>: grafias de bairro como aparecem em <c>requests.json</c>.
/// <c>Method</c>: "osm" (ponto do OpenStreetMap) ou "ruas" (mediana das ruas citadas nos pedidos do bairro).</summary>
public sealed record PlaceDto(string Label, string Search, double Lat, double Lon, string Method, IReadOnlyList<string> Aliases);

public sealed record PlacesDto(string Attribution, IReadOnlyList<PlaceDto> Places);

/// <summary>Sessões com chamada em que o vereador foi chamado (presente ou ausente). Nulo: nenhuma.</summary>
public sealed record AttendanceDto(int Sessions, int Present, int Absent);

public sealed record CouncilorDto(string Slug, string Name, string? Party, Uri? PhotoUrl, Uri ProfileUrl, TotalsDto Totals, AttendanceDto? Attendance);

public sealed record PropositionDto(
    string Id,
    string Type,
    string RawType,
    int Number,
    int Year,
    DateOnly Date,
    string Summary,
    string Category,
    Uri Url,
    string? Status);

public sealed record CouncilorProfileDto(CouncilorDto Councilor, IReadOnlyList<PropositionDto> Propositions);

public sealed record RequestDto(
    string Id,
    string Type,
    int Number,
    int Year,
    DateOnly Date,
    string Summary,
    Uri Url,
    IReadOnlyList<string> Authors,
    IReadOnlyList<string> Streets,
    IReadOnlyList<string> Neighborhoods);
