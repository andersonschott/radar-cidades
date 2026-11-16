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

        // shortcut: lastUpdated do índice só conhece a cidade publicada agora; ler meta.json das outras quando houver mais de uma.
        var index = cities.Where(c => c.Active).Select(c => new CitySummaryDto(c.Slug, c.Name, c.Uf, c.Capabilities,
            c.Slug == slug ? data.LastSuccessfulScrape : null));
        await UploadAsync("cities.json", PublicationBuilder.CitiesIndex(index, now), ct).ConfigureAwait(false);
    }

    private async Task UploadAsync(string name, byte[] content, CancellationToken ct) =>
        await container.GetBlobClient(name).UploadAsync(new BinaryData(content), new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/json; charset=utf-8", CacheControl = "public, max-age=300" },
        }, ct).ConfigureAwait(false);
}
