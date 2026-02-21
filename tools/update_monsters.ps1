$ErrorActionPreference = "Stop"

# Define paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ImgDir = Join-Path $ProjectRoot "assets\img"
$OutputFile = Join-Path $ProjectRoot "assets\monster_list.js"

Write-Host "Scanning directory: $ImgDir"

# Get all image files (webp, png, jpg, jpeg)
$Files = Get-ChildItem -Path $ImgDir -Include *.webp, *.png, *.jpg, *.jpeg -Recurse -File

# Custom Sort: Lastboss before Heal
$Files = $Files | Sort-Object {
    if ($_.Name -like "Lastboss_*") { 80 }
    elseif ($_.Name -like "Heal_*") { 90 }
    elseif ($_.Name -like "Rare_*") { 100 }
    else { 0 }
}, Name

# Create JavaScript array content
$JsContent = "window.MONSTER_ASSETS = [`n"
$FileNames = @()

foreach ($File in $Files) {
    $FileNames += "    `"$($File.Name)`""
}

$JsContent += ($FileNames -join ",`n")
$JsContent += "`n];"

# Write to file (UTF8)
$JsContent | Set-Content -Path $OutputFile -Encoding UTF8

Write-Host "Generated $OutputFile with $($Files.Count) files."
Write-Host "Done."
Start-Sleep -Seconds 2
