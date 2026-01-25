using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UmbracoContentActivity.Services;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Web.Common.Authorization;

namespace UmbracoContentActivity.Controllers
{
    /// <summary>
    /// API Controller for Content Activity Tracker
    /// </summary>
    ///
    [VersionedApiBackOfficeRoute("content-activity")]
    [ApiExplorerSettings(GroupName = "My custom Backoffice API")]
    [Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
    public class ContentActivityApiController : ManagementApiControllerBase
    {
        private readonly IContentActivityService _activityService;

        public ContentActivityApiController(IContentActivityService activityService)
        {
            _activityService = activityService;
        }

        /// <summary>
        /// Get recent content activities with server-side filtering, searching, sorting, and pagination
        /// </summary>
        /// <param name="take">Number of activities to retrieve per page (default: 10, max: 100)</param>
        /// <param name="skip">Number of activities to skip for pagination (default: 0)</param>
        /// <param name="action">Filter by action type (Created, Published, Unpublished, Saved, Trashed)</param>
        /// <param name="search">Search query for content name, user name, or content type</param>
        /// <param name="sortOrder">Sort order: 'newest' or 'oldest' (default: 'newest')</param>
        /// <returns>List of content activities</returns>
        [HttpGet]
        [ProducesResponseType(typeof(ContentActivityResponse), StatusCodes.Status200OK)]
        public IActionResult GetRecentActivities(
            [FromQuery] int take = 10,
            [FromQuery] int skip = 0,
            [FromQuery] string? action = null,
            [FromQuery] string? search = null,
            [FromQuery] string sortOrder = "newest")
        {
            // Limit to max 100 items per page
            take = Math.Min(take, 100);

            var (activities, totalCount) = _activityService.GetRecentActivities(take, skip, action, search, sortOrder);

            var response = new ContentActivityResponse
            {
                Items = [.. activities.Select(a => new ContentActivityDto
                {
                    Id = a.Id,
                    ContentKey = a.ContentKey,
                    ContentName = a.ContentName,
                    ContentTypeAlias = a.ContentTypeAlias,
                    Action = a.Action,
                    UserKey = a.UserKey,
                    UserName = a.UserName,
                    Timestamp = a.Timestamp,
                    Culture = a.Culture,
                    IsTrashed = a.IsTrashed,
                    Metadata = a.Metadata
                })],
                Total = totalCount,
                Skip = skip,
                Take = take,
                CurrentPage = (skip / take) + 1,
                TotalPages = (int)Math.Ceiling((double)totalCount / take)
            };

            return Ok(response);
        }
    }

    /// <summary>
    /// DTO for content activity
    /// </summary>
    public class ContentActivityDto
    {
        public int Id { get; set; }
        public Guid ContentKey { get; set; }
        public string? ContentName { get; set; }
        public string? ContentTypeAlias { get; set; }
        public string Action { get; set; } = string.Empty;
        public Guid? UserKey { get; set; }
        public string? UserName { get; set; }
        public DateTime Timestamp { get; set; }
        public string? Culture { get; set; }
        public bool IsTrashed { get; set; }
        public string? Metadata { get; set; }
    }

    /// <summary>
    /// Response wrapper for activities with pagination metadata
    /// </summary>
    public class ContentActivityResponse
    {
        public List<ContentActivityDto> Items { get; set; } = new();
        public int Total { get; set; }
        public int Skip { get; set; }
        public int Take { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
    }
}
