using NPoco;
using Umbraco.Cms.Infrastructure.Persistence.DatabaseAnnotations;

namespace UmbracoContentActivity.Models
{
    /// <summary>
    /// Database model for storing content activity events
    /// </summary>
    [TableName("ContentActivityLog")]
    [PrimaryKey("Id", AutoIncrement = true)]
    [ExplicitColumns]
    public class ContentActivityLog
    {
        /// <summary>
        /// Unique identifier for the activity log entry
        /// </summary>
        [PrimaryKeyColumn(AutoIncrement = true, IdentitySeed = 1)]
        [Column("Id")]
        public int Id { get; set; }

        /// <summary>
        /// The Umbraco content ID (Key/GUID)
        /// </summary>
        [Column("ContentKey")]
        [NullSetting(NullSetting = NullSettings.NotNull)]
        [Index(IndexTypes.NonClustered, Name = "IX_ContentActivityLog_ContentKey")]
        public Guid ContentKey { get; set; }

        /// <summary>
        /// The content node name
        /// </summary>
        [Column("ContentName")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [Length(500)]
        public string? ContentName { get; set; }

        /// <summary>
        /// The content type alias
        /// </summary>
        [Column("ContentTypeAlias")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [Length(255)]
        public string? ContentTypeAlias { get; set; }

        /// <summary>
        /// The action performed (Created, Published, Unpublished, Saved)
        /// </summary>
        [Column("Action")]
        [NullSetting(NullSetting = NullSettings.NotNull)]
        [Length(50)]
        [Index(IndexTypes.NonClustered, Name = "IX_ContentActivityLog_Action")]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// The user key who performed the action
        /// </summary>
        [Column("UserKey")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [Index(IndexTypes.NonClustered, Name = "IX_ContentActivityLog_UserKey")]
        public Guid? UserKey { get; set; }

        /// <summary>
        /// The username who performed the action
        /// </summary>
        [Column("UserName")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [Length(255)]
        public string? UserName { get; set; }

        /// <summary>
        /// When the activity occurred
        /// </summary>
        [Column("Timestamp")]
        [NullSetting(NullSetting = NullSettings.NotNull)]
        //[Index(IndexTypes.NonClustered, Name = "IX_ContentActivityLog_Timestamp", ForColumns = "Timestamp DESC")]
        public DateTime Timestamp { get; set; }

        /// <summary>
        /// The culture/language variant (if applicable)
        /// </summary>
        [Column("Culture")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [Length(10)]
        public string? Culture { get; set; }

        /// <summary>
        /// Whether the content is in the recycle bin
        /// </summary>
        [Column("IsTrashed")]
        [NullSetting(NullSetting = NullSettings.NotNull)]
        public bool IsTrashed { get; set; }

        /// <summary>
        /// Additional metadata as JSON
        /// </summary>
        [Column("Metadata")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [SpecialDbType(SpecialDbTypes.NVARCHARMAX)]
        public string? Metadata { get; set; }

        /// <summary>
        /// IP Address of the user (if available)
        /// </summary>
        [Column("IpAddress")]
        [NullSetting(NullSetting = NullSettings.Null)]
        [Length(45)]
        public string? IpAddress { get; set; }
    }
}
