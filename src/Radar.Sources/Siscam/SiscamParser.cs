using System.Globalization;
using System.Text.RegularExpressions;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using Radar.Domain;

namespace Radar.Sources.Siscam;

public sealed record SiscamCouncilor(SourceCouncilor Councilor, IReadOnlyList<string> Aliases);

public sealed record SiscamItem(
    string SourceId,
    string RawType,
    int Number,
    int Year,
    DateOnly Date,
    string? Status,
    IReadOnlyList<string> Authors,
    string Summary,
    Uri OfficialUrl);

public sealed record SiscamExport(int? DeclaredCount, IReadOnlyList<SiscamItem> Items);

public sealed record SiscamSessionList(int? DeclaredCount, IReadOnlyList<SourceSessionRef> Items);

/// <summary>Chamadas de uma sessão, com nomes já dobrados (<see cref="TextFolding.Fold"/>). Presente em qualquer chamada = presente.</summary>
public sealed record SiscamRollCall(int Calls, IReadOnlyList<string> Present, IReadOnlyList<string> Absent, bool CountMismatch);

/// <summary>Parser puro das páginas do SISCAM (mapeamento em docs/sources/siscam.md).</summary>
public static partial class SiscamParser
{
    private static readonly HtmlParser Parser = new();

    [GeneratedRegex(@"/(\d+)$", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex TrailingId();

    [GeneratedRegex(@"^(?<type>.+?)\s+N[º°o]\.?\s*(?<number>\d+)\s*/\s*(?<year>\d{4})", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex Title();

    [GeneratedRegex(@"(\d+)\s+registro\(s\)", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex Count();

    [GeneratedRegex(@"^(?<kind>Presentes|Ausentes) \((?<n>\d+)\)$", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex RollCallGroup();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex Spaces();

    public static IReadOnlyList<SiscamCouncilor> ParseCouncilors(string html, Uri baseUrl)
    {
        using var doc = Parser.ParseDocument(html);
        return [.. doc.QuerySelectorAll("div.data-list-item").Select(item =>
        {
            var link = item.QuerySelector("h4 > a[href^='/Vereadores/Vereador/']")
                ?? throw new InvalidDataException("Vereador sem link de perfil.");
            var id = TrailingId().Match(link.GetAttribute("href")!).Groups[1].Value;
            var name = Clean(link.TextContent);
            var civil = item.QuerySelector($"a[href='/Vereadores/Vereador/{id}'][title]")?.GetAttribute("title");
            var photo = item.QuerySelector("img[src^='/Vereadores/Foto/']")?.GetAttribute("src");
            var party = LabeledValue(item, "Partido");
            var councilor = new SourceCouncilor(id, name, string.IsNullOrEmpty(party) ? null : party,
                photo is null ? null : new Uri(baseUrl, photo), new Uri(baseUrl, $"Vereadores/Vereador/{id}"));
            return new SiscamCouncilor(councilor, [.. new[] { name, civil }.OfType<string>().Select(TextFolding.Fold).Distinct(StringComparer.Ordinal)]);
        })];
    }

    /// <summary>Versão de impressão (<c>/Documentos/Exportar?tipo=0</c>): blocos irmãos de um <c>h4</c> até o <c>hr</c>.</summary>
    public static SiscamExport ParseExport(string html, Uri baseUrl)
    {
        using var doc = Parser.ParseDocument(html);
        var header = doc.QuerySelectorAll("p.text-center").Select(p => Count().Match(p.TextContent)).FirstOrDefault(m => m.Success);
        var items = new List<SiscamItem>();

        foreach (var h4 in doc.QuerySelectorAll("h4").Where(h => h.QuerySelector("a[href^='/Documentos/Documento/']") is not null))
        {
            var link = h4.QuerySelector("a")!;
            var id = TrailingId().Match(link.GetAttribute("href")!).Groups[1].Value;
            var title = Title().Match(Clean(link.TextContent));
            var block = new List<IElement>();
            for (var next = h4.NextElementSibling; next is not null && next.LocalName is not ("hr" or "h4"); next = next.NextElementSibling)
            {
                block.Add(next);
            }

            var date = Field(block, "Data");
            items.Add(new SiscamItem(
                id,
                title.Success ? title.Groups["type"].Value : Clean(link.TextContent),
                title.Success ? int.Parse(title.Groups["number"].Value, CultureInfo.InvariantCulture) : 0,
                title.Success ? int.Parse(title.Groups["year"].Value, CultureInfo.InvariantCulture) : 0,
                DateOnly.ParseExact(date ?? throw new InvalidDataException($"Documento {id} sem data."), "dd/MM/yyyy", CultureInfo.InvariantCulture),
                Field(block, "Situação"),
                [.. (Field(block, "Autoria") ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)],
                Field(block, "Assunto") ?? string.Empty,
                new Uri(baseUrl, $"Documentos/Documento/{id}")));
        }

        return new SiscamExport(header is null ? null : int.Parse(header.Groups[1].Value, CultureInfo.InvariantCulture), items);
    }

    /// <summary>Página de <c>/Sessoes/Pesquisa</c>: itens <c>div.data-list-item</c> e o total "N registro(s)".</summary>
    public static SiscamSessionList ParseSessionList(string html, Uri baseUrl)
    {
        using var doc = Parser.ParseDocument(html);
        var declared = Count().Match(doc.Body?.TextContent ?? string.Empty);
        var items = doc.QuerySelectorAll("div.data-list-item")
            .Select(item => (Item: item, Link: item.QuerySelector("h4 > a[href^='/Sessoes/Sessao/']")))
            .Where(x => x.Link is not null)
            .Select(x =>
            {
                var id = TrailingId().Match(x.Link!.GetAttribute("href")!).Groups[1].Value;
                var date = LabeledValue(x.Item, "Data") ?? throw new InvalidDataException($"Sessão {id} sem data.");
                return new SourceSessionRef(id, Clean(x.Link.TextContent),
                    DateOnly.ParseExact(date, "dd/MM/yyyy", CultureInfo.InvariantCulture), new Uri(baseUrl, $"Sessoes/Sessao/{id}"));
            });
        return new SiscamSessionList(declared.Success ? int.Parse(declared.Groups[1].Value, CultureInfo.InvariantCulture) : null, [.. items]);
    }

    /// <summary>Bloco "Frequências" de <c>/Sessoes/Sessao/{id}</c>. Os grupos "Ausente (n)" das votações ficam de fora.</summary>
    public static SiscamRollCall ParseRollCall(string html)
    {
        using var doc = Parser.ParseDocument(html);
        var heading = doc.QuerySelectorAll("h3").FirstOrDefault(h => Clean(h.TextContent) == "Frequências");
        var list = heading?.NextElementSibling;
        if (list is null || !list.ClassList.Contains("data-list"))
        {
            return new SiscamRollCall(0, [], [], false);
        }

        var present = new HashSet<string>(StringComparer.Ordinal);
        var absent = new HashSet<string>(StringComparer.Ordinal);
        int calls = 0;
        var mismatch = false;
        foreach (var call in list.QuerySelectorAll("div.data-list-item"))
        {
            calls++;
            foreach (var strong in call.QuerySelectorAll("p > strong"))
            {
                var group = RollCallGroup().Match(Clean(strong.TextContent));
                if (!group.Success)
                {
                    continue;
                }

                var text = strong.ParentElement!.TextContent;
                var names = Clean(text[(text.IndexOf(strong.TextContent, StringComparison.Ordinal) + strong.TextContent.Length)..]).TrimStart('-', ' ')
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(TextFolding.Fold).ToList();
                mismatch |= names.Count != int.Parse(group.Groups["n"].Value, CultureInfo.InvariantCulture);
                (group.Groups["kind"].Value == "Presentes" ? present : absent).UnionWith(names);
            }
        }

        absent.ExceptWith(present);
        return new SiscamRollCall(calls, [.. present.Order(StringComparer.Ordinal)], [.. absent.Order(StringComparer.Ordinal)], mismatch);
    }

    private static string? Field(IEnumerable<IElement> block, string label) =>
        block.Select(e => LabeledValue(e, label)).FirstOrDefault(v => v is not null);

    /// <summary>Texto depois de <c>&lt;strong&gt;Rótulo:&lt;/strong&gt;</c>, decodificado e com espaços normalizados.</summary>
    private static string? LabeledValue(IElement scope, string label)
    {
        var strong = scope.QuerySelectorAll("strong").FirstOrDefault(s => Clean(s.TextContent) == label + ":");
        if (strong?.ParentElement is not { } parent)
        {
            return null;
        }

        return Clean(parent.TextContent.Replace(strong.TextContent, string.Empty, StringComparison.Ordinal));
    }

    private static string Clean(string text) => Spaces().Replace(text, " ").Trim();
}
