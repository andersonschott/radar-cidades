using Radar.Domain;

namespace Radar.Domain.Tests;

public sealed class TextFoldingTests
{
    [Theory]
    [InlineData("José da Silva", "jose-da-silva")]
    [InlineData("  Dr. Ângela  O'Neil ", "dr-angela-o-neil")]
    [InlineData("Paulo Monaro (Paulinho)", "paulo-monaro-paulinho")]
    public void Slug_IsUrlSafe(string name, string expected) => TextFolding.Slug(name).ShouldBe(expected);

    [Fact]
    public void ContentHash_IgnoresAuthorOrder_ButNotSummary()
    {
        var a = new SourceProposition("1", "Indicação", 10, 2025, new DateOnly(2025, 2, 3), "Tapa-buraco",
            new Uri("https://x/1"), ["a", "b"]);

        a.ContentHash().ShouldBe((a with { AuthorSourceIds = ["b", "a"] }).ContentHash());
        a.ContentHash().ShouldNotBe((a with { Summary = "Poda" }).ContentHash());
        a.ContentHash().Length.ShouldBe(64);
    }
}
