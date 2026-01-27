using Umbraco.Cms.Web.Common.ApplicationBuilder;
using UmbracoContentActivity.Hubs;

namespace UmbracoContentActivity.Extensions;

/// <summary>
/// Extension methods for adding Content Activity Tracker services to the DI container.
/// </summary>
public static class UmbracoContentActivityExtensions
{
    /// <summary>
    /// Maps the Content Activity SignalR hub endpoint.
    /// </summary>
    /// <param name="endpoints">The endpoint route builder.</param>
    /// <param name="pattern">The hub endpoint pattern. Default: /umbraco/signalr/content-activity</param>
    /// <returns>The endpoint route builder for method chaining.</returns>
    public static IUmbracoEndpointBuilderContext MapContentActivityHub(
        this IUmbracoEndpointBuilderContext endpoints, 
        string pattern = "/umbraco/signalr/content-activity")
    {
        endpoints.EndpointRouteBuilder.MapHub<ContentActivityHub>(pattern);
        return endpoints;
    }
}