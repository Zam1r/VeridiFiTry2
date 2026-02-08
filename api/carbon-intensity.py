"""
Vercel Serverless Function: Carbon Intensity API
Fetches data from carbonintensity.org.uk/api/v1/intensity
Strips all headers and returns only the 'actual' intensity value as raw JSON
"""

import json
import urllib.request
import urllib.error


def handler(request):
    """
    Vercel serverless function handler
    
    Fetches carbon intensity data, strips headers, and returns only the 'actual' value.
    
    Args:
        request: Vercel request object (not used, but required by Vercel)
        
    Returns:
        dict: Response with statusCode and body containing the actual intensity value
    """
    try:
        # Fetch data from carbon intensity API
        # Using the /api/v1/intensity endpoint as specified
        api_url = "https://carbonintensity.org.uk/api/v1/intensity"
        
        # Create request with NO custom headers (stripped as requested)
        # Only the minimal Accept header for JSON response
        req = urllib.request.Request(api_url)
        req.add_header("Accept", "application/json")
        
        # Fetch the data (10 second timeout)
        with urllib.request.urlopen(req, timeout=10) as response:
            # Read response body
            response_data = response.read().decode('utf-8')
            data = json.loads(response_data)
        
        # Extract the 'actual' intensity value
        # API structure: { "data": [{ "intensity": { "actual": <number> } }] }
        actual_intensity = None
        
        if "data" in data and len(data["data"]) > 0:
            intensity_obj = data["data"][0].get("intensity", {})
            actual_intensity = intensity_obj.get("actual")
        
        if actual_intensity is None:
            return {
                "statusCode": 500,
                "headers": {
                    "Content-Type": "application/json",
                },
                "body": json.dumps({
                    "error": "Could not extract actual intensity value",
                    "raw_data": data
                })
            }
        
        # Return just the actual intensity value as raw JSON object
        # No extra headers, no metadata - just the value
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
            },
            "body": json.dumps({
                "actual": actual_intensity
            })
        }
        
    except urllib.error.URLError as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
            },
            "body": json.dumps({
                "error": f"Failed to fetch from API: {str(e)}"
            })
        }
    except json.JSONDecodeError as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
            },
            "body": json.dumps({
                "error": f"Failed to parse API response: {str(e)}"
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
            },
            "body": json.dumps({
                "error": f"Unexpected error: {str(e)}"
            })
        }

