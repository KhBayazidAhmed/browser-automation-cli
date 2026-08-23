$ErrorActionPreference = "Stop"

$Repository = if ($env:BFLOW_REPOSITORY) {
    $env:BFLOW_REPOSITORY
} else {
    "KhBayazidAhmed/browser-automation-cli"
}
$RequestedVersion = if ($env:BFLOW_VERSION) {
    $env:BFLOW_VERSION
} else {
    "latest"
}
$InstallDirectory = if ($env:BFLOW_INSTALL_DIR) {
    $env:BFLOW_INSTALL_DIR
} else {
    Join-Path $env:LOCALAPPDATA "Programs\bflow"
}

$Architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
switch ($Architecture) {
    "x64" { $Platform = "windows-x64" }
    "arm64" { $Platform = "windows-arm64" }
    default { throw "Unsupported CPU architecture: $Architecture" }
}

$Asset = "bflow-$Platform.zip"
if ($RequestedVersion -eq "latest") {
    $ReleaseUrl = "https://github.com/$Repository/releases/latest/download"
} else {
    $ReleaseTag = if ($RequestedVersion.StartsWith("v")) {
        $RequestedVersion
    } else {
        "v$RequestedVersion"
    }
    $ReleaseUrl = "https://github.com/$Repository/releases/download/$ReleaseTag"
}

$TemporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("bflow-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $TemporaryDirectory | Out-Null

try {
    $ArchivePath = Join-Path $TemporaryDirectory $Asset
    $ChecksumPath = Join-Path $TemporaryDirectory "SHA256SUMS"

    Write-Host "Downloading $Asset..."
    Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseUrl/$Asset" -OutFile $ArchivePath
    Invoke-WebRequest -UseBasicParsing -Uri "$ReleaseUrl/SHA256SUMS" -OutFile $ChecksumPath

    $ChecksumLine = Get-Content $ChecksumPath | Where-Object {
        $_ -match ("\s" + [regex]::Escape($Asset) + "$")
    } | Select-Object -First 1
    if (-not $ChecksumLine) {
        throw "Checksum for $Asset was not published."
    }

    $ExpectedChecksum = ($ChecksumLine -split "\s+")[0].ToLowerInvariant()
    $ActualChecksum = (Get-FileHash -Algorithm SHA256 -Path $ArchivePath).Hash.ToLowerInvariant()
    if ($ExpectedChecksum -ne $ActualChecksum) {
        throw "Checksum verification failed."
    }

    Expand-Archive -Path $ArchivePath -DestinationPath $TemporaryDirectory -Force
    $DownloadedExecutable = Join-Path $TemporaryDirectory "bflow.exe"
    if (-not (Test-Path $DownloadedExecutable)) {
        throw "Release archive is missing bflow.exe."
    }

    New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
    $InstalledExecutable = Join-Path $InstallDirectory "bflow.exe"
    Copy-Item -Path $DownloadedExecutable -Destination $InstalledExecutable -Force

    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $PathEntries = @($UserPath -split ";" | Where-Object { $_ })
    $NormalizedInstallDirectory = $InstallDirectory.TrimEnd([System.IO.Path]::DirectorySeparatorChar)
    if (-not ($PathEntries | Where-Object { $_.TrimEnd([System.IO.Path]::DirectorySeparatorChar) -ieq $NormalizedInstallDirectory })) {
        $UpdatedUserPath = if ([string]::IsNullOrWhiteSpace($UserPath)) {
            $InstallDirectory
        } else {
            "$UserPath;$InstallDirectory"
        }
        [Environment]::SetEnvironmentVariable("Path", $UpdatedUserPath, "User")
    }
    if (-not (($env:Path -split ";") | Where-Object { $_.TrimEnd([System.IO.Path]::DirectorySeparatorChar) -ieq $NormalizedInstallDirectory })) {
        $env:Path = "$InstallDirectory;$env:Path"
    }

    $InstalledVersion = & $InstalledExecutable --version
    Write-Host ""
    Write-Host "Installed $InstalledVersion at $InstalledExecutable"
    Write-Host "Run: bflow"
} finally {
    Remove-Item -Recurse -Force $TemporaryDirectory -ErrorAction SilentlyContinue
}
