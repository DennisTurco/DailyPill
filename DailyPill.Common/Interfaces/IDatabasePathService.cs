using DailyPill.Common.DTOs;

namespace DailyPill.Common.Interfaces;

public interface IDatabasePathService
{
    DatabasePathDTO GetCurrentWithFallback();
    DatabasePathDTO UpdateByPath(string path);
    DatabasePathDTO ResetToDefault();
}
