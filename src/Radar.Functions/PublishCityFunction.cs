using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Functions.Worker;
using Radar.Data;
using Radar.Domain;
using Radar.Publishing;

namespace Radar.Functions;

/// <summary>Grava os JSON públicos da cidade e o índice <c>cities.json</c> no container <c>data</c>.</summary>
public sealed class PublishCityFunction(IReadOnlyList<CityConfig> cities, PublicationQueries queries, BlobContainerClient container, TimeProvider clock)
{
    [Function("PublishCity")]
    public async Task Run([QueueTrigger(QueueNames.Publish)] string slug, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var config = cities.Single(c => c.Slug == slug);
        var data = await queries.LoadAsync(config, ct).ConfigureAwait(false);
        foreach (var (path, content) in PublicationBuilder.CityFiles(data, now))
        {
            await UploadAsync($"{slug}/{path}", content, ct).ConfigureAwait(false);
        }

        // Posições de bairro (tools/geo) são opcionais: cidade sem o arquivo só não tem mapa.
        var places = Path.Combine(AppContext.BaseDirectory, "cities", $"{slug}.neighborhoods.json");
        if (File.Exists(places))
        {
            await UploadAsync($"{slug}/places.json", PublicationBuilder.Places(await File.ReadAllTextAsync(places, ct).ConfigureAwait(false), slug, now), ct).ConfigureAwait(false);
        }

        var last = await queries.LastSuccessBySlugAsync(ct).ConfigureAwait(false);
        var index = new List<CitySummaryDto>();
        foreach (var c in cities.Where(c => c.Active))
        {
            // Cidade coletada fora da nuvem não tem run neste banco: a data vem do meta.json que o sync local subiu.
            var updated = last.GetValueOrDefault(c.Slug) ?? await PublishedLastScrapeAsync(c.Slug, ct).ConfigureAwait(false);
            index.Add(new CitySummaryDto(c.Slug, c.Name, c.Uf, c.Capabilities, updated));
        }

        await UploadAsync("cities.json", PublicationBuilder.CitiesIndex(index, now), ct).ConfigureAwait(false);
    }

    private async Task<DateTimeOffset?> PublishedLastScrapeAsync(string slug, CancellationToken ct)
    {
        var blob = container.GetBlobClient($"{slug}/meta.json");
        if (!await blob.ExistsAsync(ct).ConfigureAwait(false))
        {
            return null;
        }

        var content = (await blob.DownloadContentAsync(ct).ConfigureAwait(false)).Value.Content;
        using var doc = System.Text.Json.JsonDocument.Parse(content.ToMemory());
        return doc.RootElement.GetProperty("data").TryGetProperty("lastSuccessfulScrape", out var v) && v.ValueKind == System.Text.Json.JsonValueKind.String
            ? v.GetDateTimeOffset() : null;
    }

    private async Task UploadAsync(string name, byte[] content, CancellationToken ct) =>
        await container.GetBlobClient(name).UploadAsync(new BinaryData(content), new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/json; charset=utf-8", CacheControl = "public, max-age=300" },
        }, ct).ConfigureAwait(false);
}
