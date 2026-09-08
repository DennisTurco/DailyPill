import subprocess

_nvidia_gpu_cache: bool | None = None


def detect_nvidia_gpu() -> bool:
    """Check for an NVIDIA GPU via nvidia-smi. Cached after the first call."""
    global _nvidia_gpu_cache
    if _nvidia_gpu_cache is not None:
        return _nvidia_gpu_cache
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        _nvidia_gpu_cache = result.returncode == 0 and bool(result.stdout.strip())
    except Exception:
        _nvidia_gpu_cache = False
    return _nvidia_gpu_cache
