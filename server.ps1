# Simple HTTP server in PowerShell for KazBildInvest prototype
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
try {
    $listener.Start()
    Write-Host "Server started at http://localhost:8080/"
    
    $baseDir = $PSScriptRoot
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $url = $request.Url.LocalPath
        
        # Error logging endpoint
        if ($url -eq "/log") {
            $msg = $request.QueryString["msg"]
            Write-Host "--- BROWSER LOG: $msg" -ForegroundColor Red
            
            $response.StatusCode = 200
            $response.ContentType = "text/plain"
            $okBytes = [System.Text.Encoding]::UTF8.GetBytes("OK")
            $response.OutputStream.Write($okBytes, 0, $okBytes.Length)
            $response.Close()
            continue
        }
        
        if ($url -eq "/") {
            $url = "/index.html"
        }
        
        $relPath = $url.TrimStart('/')
        $filePath = Join-Path $baseDir $relPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            if ($ext -eq ".html") {
                $response.ContentType = "text/html; charset=utf-8"
            } elseif ($ext -eq ".css") {
                $response.ContentType = "text/css; charset=utf-8"
            } elseif ($ext -eq ".js") {
                $response.ContentType = "application/javascript; charset=utf-8"
            }
            
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            Write-Host "--- 404 NOT FOUND: $url (Full Path: $filePath)" -ForegroundColor Red
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $listener.Stop()
}
