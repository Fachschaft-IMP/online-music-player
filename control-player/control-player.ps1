$directory = 'C:\Fachschaft\music-player\control-player\command'
$playerPath = 'C:\Program Files\DAUM\PotPlayer\PotPlayerMini64.exe'

# Add the System.Windows.Forms assembly
Add-Type -AssemblyName System.Windows.Forms

while ($true) {
    $file = Get-ChildItem -Path $directory
    if ($file) {
        $action = $file.Name
        Remove-Item $file.FullName
        switch ($action) {
            'start' {
                Start-Process $playerPath
            }
            'exit' {
                Stop-Process -Name 'PotPlayerMini64'
            }
            'pause' {
                # Send the Page Down key
                [System.Windows.Forms.SendKeys]::SendWait('{PGDN}')
            }
            'skip' {
                # Send the Page Up key
                [System.Windows.Forms.SendKeys]::SendWait('{PGUP}')
            }
        }
    }
    Start-Sleep -Seconds 1
}
