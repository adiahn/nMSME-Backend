$uri = "http://localhost:5000/api/judge/applications/68ba8610a74ec456caa3cdb4/score"
$body = @{
    criteria_scores = @{
        business_viability_financial_health = 0
        market_opportunity_traction = 0
        social_impact_job_creation = 0
        innovation_technology_adoption = 0
        sustainability_environmental_impact = 0
        management_leadership = 10
    }
    overall_score = 29
    comments = "test comment"
    recommendations = "test recommendations"
    review_notes = "test review notes"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    Write-Host "Testing scoring endpoint..."
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $body -Headers $headers
    Write-Host "Success: $($response | ConvertTo-Json -Depth 10)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response)"
}
