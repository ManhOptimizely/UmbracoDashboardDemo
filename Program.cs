WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

// Add SignalR
builder.Services.AddSignalR();

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .Build();

WebApplication app = builder.Build();

await app.BootUmbracoAsync();


app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
        
        // Map SignalR hub
        u.EndpointRouteBuilder.MapHub<UmbracoContentActivity.Hubs.ContentActivityHub>("/umbraco/signalr/content-activity");
    });

await app.RunAsync();

