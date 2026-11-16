namespace Radar.Sources;

/// <summary>Leitura mínima de robots.txt (SDD §8.2): grupo do nosso agente, senão o "*"; vence a regra mais longa.</summary>
public static class RobotsTxt
{
    public static bool IsAllowed(string robotsText, string agentToken, string path)
    {
        ArgumentNullException.ThrowIfNull(robotsText);
        var groups = new List<(List<string> Agents, List<(bool Allow, string Prefix)> Rules)>();
        (List<string> Agents, List<(bool, string)> Rules)? current = null;
        var lastWasAgent = false;

        foreach (var raw in robotsText.Split('\n'))
        {
            var line = raw.Split('#')[0].Trim();
            var colon = line.IndexOf(':', StringComparison.Ordinal);
            if (colon < 0)
            {
                continue;
            }

            var key = line[..colon].Trim().ToUpperInvariant();
            var value = line[(colon + 1)..].Trim();
            if (key == "USER-AGENT")
            {
                if (current is null || !lastWasAgent)
                {
                    current = ([], []);
                    groups.Add(current.Value);
                }

                current.Value.Agents.Add(value);
                lastWasAgent = true;
            }
            else if (current is not null && key is "ALLOW" or "DISALLOW")
            {
                lastWasAgent = false;
                if (value.Length > 0)
                {
                    current.Value.Rules.Add((key == "ALLOW", value));
                }
            }
        }

        var group = groups.FirstOrDefault(g => g.Agents.Exists(a => a.Equals(agentToken, StringComparison.OrdinalIgnoreCase)));
        if (group.Agents is null)
        {
            group = groups.FirstOrDefault(g => g.Agents.Contains("*"));
        }

        var match = group.Rules?.Where(r => path.StartsWith(r.Prefix, StringComparison.Ordinal))
            .OrderByDescending(r => r.Prefix.Length).ThenByDescending(r => r.Allow)
            .Select(r => ((bool Allow, string Prefix)?)r).FirstOrDefault();
        return match is null || match.Value.Allow;
    }
}
