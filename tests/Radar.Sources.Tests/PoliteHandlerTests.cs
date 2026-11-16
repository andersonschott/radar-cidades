using System.Net;
using Microsoft.Extensions.Time.Testing;

namespace Radar.Sources.Tests;

public sealed class PoliteHandlerTests
{
    [Fact]
    public async Task SecondRequestToSameHost_WaitsOneSecond()
    {
        var clock = new FakeTimeProvider();
        using var handler = new PoliteHandler(clock) { InnerHandler = new OkHandler() };
        using var http = new HttpClient(handler);
        var ct = CancellationToken.None;

        await http.GetAsync(new Uri("https://a.example/1"), ct);
        var second = http.GetAsync(new Uri("https://a.example/2"), ct);
        var otherHost = http.GetAsync(new Uri("https://b.example/1"), ct);

        await otherHost;
        second.IsCompleted.ShouldBeFalse();
        clock.Advance(TimeSpan.FromSeconds(1));
        (await second).StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    private sealed class OkHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
    }
}
