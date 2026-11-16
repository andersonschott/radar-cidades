using System.Text.Json.Serialization;

namespace Radar.Publishing;

// Contrato JSON público (SDD §9). Mudança incompatível = SchemaVersion + 1.

public sealed record Envelope<T>(
    int SchemaVersion,
    DateTimeOffset GeneratedAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? City,
    T Data);

public sealed record CitySummaryDto(string Slug, string Name, string Uf, IReadOnlyList<string> Capabilities, DateTimeOffset? LastUpdated);

public sealed record TotalsDto(int Propositions, int NeighborhoodRequests, IReadOnlyDictionary<string, int> ByType);

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
    int Sessions);

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
    Uri Url);

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
