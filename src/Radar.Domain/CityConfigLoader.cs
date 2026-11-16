using System.Text.Json;
using System.Text.Json.Serialization;

namespace Radar.Domain;

public static class CityConfigLoader
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static CityConfig Parse(string json) =>
        JsonSerializer.Deserialize<CityConfig>(json, Options)
        ?? throw new InvalidDataException("Configuração de cidade vazia.");

    /// <summary>Lê todos os <c>*.json</c> de uma pasta <c>cities/</c>, ignorando arquivos auxiliares (<c>*.neighborhoods.json</c>).</summary>
    public static IReadOnlyList<CityConfig> LoadAll(string directory) =>
        [.. Directory.EnumerateFiles(directory, "*.json")
            .Where(f => Path.GetFileName(f).Count(c => c == '.') == 1)
            .Order(StringComparer.Ordinal)
            .Select(f => Parse(File.ReadAllText(f)))];
}
