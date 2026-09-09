using System.Diagnostics;
using DailyPill.Common.Interfaces;

namespace DailyPill.Infrastructure.Services;

public class GpuService : IGpuService
{
    private static bool? _cache;
    private static readonly object Lock = new();

    public bool DetectNvidiaGpu()
    {
        lock (Lock)
        {
            if (_cache.HasValue) return _cache.Value;

            try
            {
                var startInfo = new ProcessStartInfo
                {
                    FileName = "nvidia-smi",
                    Arguments = "--query-gpu=name --format=csv,noheader",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };
                using var process = Process.Start(startInfo);
                if (process is null)
                {
                    _cache = false;
                    return false;
                }

                var output = process.StandardOutput.ReadToEnd();
                var exited = process.WaitForExit(5000);
                if (!exited)
                {
                    try { process.Kill(); } catch { /* best effort */ }
                    _cache = false;
                    return false;
                }

                _cache = process.ExitCode == 0 && !string.IsNullOrWhiteSpace(output);
            }
            catch
            {
                _cache = false;
            }

            return _cache.Value;
        }
    }
}
