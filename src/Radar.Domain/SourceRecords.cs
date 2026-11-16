using System.Security.Cryptography;
using System.Text;

namespace Radar.Domain;

// Contrato entre os adaptadores de fonte (Radar.Sources) e a persistência (Radar.Data).

public sealed record SourceCouncilor(
    string SourceId,
    string Name,
    string? PartyAcronym,
    Uri? PhotoUrl,
    Uri ProfileUrl);

public sealed record SourceProposition(
    string SourceId,
    string RawType,
    int Number,
    int Year,
    DateOnly PresentedOn,
    string Summary,
    Uri OfficialUrl,
    IReadOnlyList<string> AuthorSourceIds,
    string? Status = null)
{
    /// <summary>Hash do conteúdo coletado; muda quando a fonte altera o registro (upsert, SDD §6).</summary>
    public string ContentHash()
    {
        var canonical = string.Join('\u001f',
            RawType, Number, Year, PresentedOn.ToString("O", System.Globalization.CultureInfo.InvariantCulture),
            Summary, OfficialUrl, Status ?? string.Empty, string.Join(',', AuthorSourceIds.Order(StringComparer.Ordinal)));
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }
}

/// <summary>Proposição já classificada, pronta para persistir.</summary>
public sealed record ClassifiedProposition(
    SourceProposition Source,
    PropositionType Type,
    PropositionCategory Category,
    IReadOnlyList<PropositionLocation> Locations);

/// <summary>Sessão listada na fonte, sem a presença.</summary>
public sealed record SourceSessionRef(string SourceId, string Name, DateOnly Date, Uri OfficialUrl);

/// <summary>Presença de uma sessão, por SourceId de vereador. <c>HasRollCall</c> falso: a fonte não publicou chamada.</summary>
public sealed record SourceSession(SourceSessionRef Ref, bool HasRollCall, IReadOnlyList<string> PresentIds, IReadOnlyList<string> AbsentIds);
