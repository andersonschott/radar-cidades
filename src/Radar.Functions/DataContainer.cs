using Azure.Identity;
using Azure.Storage.Blobs;
using Microsoft.Extensions.Configuration;

namespace Radar.Functions;

/// <summary>Container público <c>data</c> (SDD §9). Mesma conta do host: identidade gerenciada no Azure, connection string no Azurite.</summary>
public static class DataContainer
{
    public const string Name = "data";

    public static BlobContainerClient Create(IConfiguration config)
    {
        ArgumentNullException.ThrowIfNull(config);
        var account = config["AzureWebJobsStorage:accountName"];
        var service = account is null
            ? new BlobServiceClient(config["AzureWebJobsStorage"])
            : new BlobServiceClient(new Uri($"https://{account}.blob.core.windows.net"), new DefaultAzureCredential());
        return service.GetBlobContainerClient(Name);
    }
}
