using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TestProject.Models;
using TestProject.Services;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Web.Common.Authorization;

namespace TestProject.Controllers
{
    /// <summary>
    /// API Controller for Content Activity Tracker
    /// </summary>
    [ApiController]
    [Route("umbraco/management/api/v1/content-activity")]
    [MapToApi("management")]
    //[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
    public class ContentActivityApiController : ControllerBase
    {
        private readonly IContentActivityService _activityService;

        public ContentActivityApiController(IContentActivityService activityService)
        {
            _activityService = activityService;
        }

        /// <summary>
        /// Get recent content activities
        /// </summary>
        /// <param name="take">Number of activities to retrieve (default: 50, max: 100)</param>
        /// <param name="action">Filter by action type (Created, Published, Unpublished, Saved, Trashed)</param>
        /// <returns>List of content activities</returns>
        [HttpGet]
        [ProducesResponseType(typeof(ContentActivityResponse), StatusCodes.Status200OK)]
        public IActionResult GetRecentActivities([FromQuery] int take = 50, [FromQuery] string? action = null)
        {
            // Limit to max 100 items
            take = Math.Min(take, 100);

            var activities = _activityService.GetRecentActivities(take, action);

            var response = new ContentActivityResponse
            {
                Items = activities.Select(a => new ContentActivityDto
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
                }).ToList(),
                Total = activities.Count()
            };

            return Ok(response);
        }

        /// <summary>
        /// Get activities for a specific content item
        /// </summary>
        /// <param name="contentKey">The content item GUID</param>
        [HttpGet("by-content/{contentKey:guid}")]
        [ProducesResponseType(typeof(ContentActivityResponse), StatusCodes.Status200OK)]
        public IActionResult GetActivitiesByContent(Guid contentKey)
        {
            var activities = _activityService.GetActivitiesByContent(contentKey);

            var response = new ContentActivityResponse
            {
                Items = activities.Select(a => new ContentActivityDto
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
                }).ToList(),
                Total = activities.Count()
            };

            return Ok(response);
        }

        /// <summary>
        /// Get activities for a specific user
        /// </summary>
        /// <param name="userKey">The user GUID</param>
        [HttpGet("by-user/{userKey:guid}")]
        [ProducesResponseType(typeof(ContentActivityResponse), StatusCodes.Status200OK)]
        public IActionResult GetActivitiesByUser(Guid userKey)
        {
            var activities = _activityService.GetActivitiesByUser(userKey);

            var response = new ContentActivityResponse
            {
                Items = activities.Select(a => new ContentActivityDto
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
                }).ToList(),
                Total = activities.Count()
            };

            return Ok(response);
        }

        /// <summary>
        /// Get activity statistics
        /// </summary>
        /// <param name="sinceDays">Number of days to look back (default: all time)</param>
        [HttpGet("statistics")]
        [ProducesResponseType(typeof(ContentActivityStats), StatusCodes.Status200OK)]
        public IActionResult GetStatistics([FromQuery] int? sinceDays = null)
        {
            DateTime? since = sinceDays.HasValue 
                ? DateTime.UtcNow.AddDays(-sinceDays.Value) 
                : null;

            var stats = _activityService.GetStatistics(since);

            return Ok(stats);
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
    /// Response wrapper for activities
    /// </summary>
    public class ContentActivityResponse
    {
        public List<ContentActivityDto> Items { get; set; } = new();
        public int Total { get; set; }
    }
}
