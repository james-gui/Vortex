$apiKey = "vtx_live_aa7d7d2e42aae256d329a5e615453c81d61c1409edd8222406a327806b0cc9fb"
$callSid = "CA_TEST_" + (Get-Random)

Write-Host "1. Creating Intent for $callSid..."
$body = @{ call_sid = $callSid; amount = 9900; callback_url = "http://example.com/webhook" } | ConvertTo-Json -Depth 10
$intent = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/payments/intent" -Method Post -Headers @{"x-api-key"=$apiKey; "Content-Type"="application/json"} -Body $body -UseBasicParsing
Write-Host "Transaction ID: $($intent.transaction_id)"

Write-Host "2. Simulating Twilio <Gather>..."
$gather = Invoke-RestMethod -Uri "http://localhost:3000/api/twilio/gather" -Method Post -Body @{ CallSid=$callSid } -UseBasicParsing

Write-Host "3. Simulating User Typing Card..."
$card = Invoke-RestMethod -Uri "http://localhost:3000/api/twilio/process" -Method Post -Body @{ CallSid=$callSid; Digits="4242424242424242" } -UseBasicParsing

Write-Host "4. Simulating User Typing Expiry..."
$expiry = Invoke-RestMethod -Uri "http://localhost:3000/api/twilio/process" -Method Post -Body @{ CallSid=$callSid; Digits="1225" } -UseBasicParsing

Write-Host "5. Simulating User Typing CVV (Final Step!)..."
$final = Invoke-RestMethod -Uri "http://localhost:3000/api/twilio/process" -Method Post -Body @{ CallSid=$callSid; Digits="123" } -UseBasicParsing

Write-Host "`n--- FINAL TWILIO RESPONSE ---"
Write-Host $final.OuterXml
