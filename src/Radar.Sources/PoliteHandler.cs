using System.Collections.Concurrent;

namespace Radar.Sources;

/// <summary>Etiqueta de coleta (SDD §8.2): no máximo 1 requisição por segundo e 1 em voo por host.</summary>
public sealed class PoliteHandler(TimeProvider clock) : DelegatingHandler
{
    public static readonly TimeSpan MinInterval = TimeSpan.FromSeconds(1);

    private readonly ConcurrentDictionary<string, HostGate> gates = new(StringComparer.OrdinalIgnoreCase);

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var gate = gates.GetOrAdd(request.RequestUri!.Host, _ => new HostGate());
        await gate.Lock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var wait = gate.Last + MinInterval - clock.GetUtcNow();
            if (wait > TimeSpan.Zero)
            {
                await Task.Delay(wait, clock, cancellationToken).ConfigureAwait(false);
            }

            return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            gate.Last = clock.GetUtcNow();
            gate.Lock.Release();
        }
    }

    private sealed class HostGate
    {
        public SemaphoreSlim Lock { get; } = new(1, 1);

        public DateTimeOffset Last { get; set; } = DateTimeOffset.MinValue;
    }
}
