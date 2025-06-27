import requests
import json

def get_vessel_qna_snapshot(imo: str, question_no: str):
    # Hardcoded token - for testing purposes only
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiNjRkMzdhMDM1Mjk5YjFlMDQxOTFmOTJhIiwiZmlyc3ROYW1lIjoiU3lpYSIsImxhc3ROYW1lIjoiRGV2IiwiZW1haWwiOiJkZXZAc3lpYS5haSIsInJvbGUiOiJhZG1pbiIsInJvbGVJZCI6IjVmNGUyODFkZDE4MjM0MzY4NDE1ZjViZiIsImlhdCI6MTc0MDgwODg2OH0sImlhdCI6MTc0MDgwODg2OCwiZXhwIjoxNzcyMzQ0ODY4fQ.1grxEO0aO7wfkSNDzpLMHXFYuXjaA1bBguw2SJS9r2M"
    
    # API endpoint
    url = f"https://dev-api.siya.com/v1.0/vessel-info/qna-snapshot/{imo}/{question_no}"
    
    # Headers
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        # Make the API request
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        # Parse the response
        data = response.json()
        
        # Check if resultData exists and is a string
        if isinstance(data.get('resultData'), str):
            result = data['resultData']
        else:
            result = data
            
        print(json.dumps(result, indent=2))
        return result
    
    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
        return None

if __name__ == "__main__":
    # Test the function with sample IMO and question number
    # Using BW KIZOKU's IMO number from previous test
    imo = "9810032"
    question_no = "1"  # You can change this to test different questions
    
    print(f"Getting QnA snapshot for IMO: {imo}, Question: {question_no}")
    get_vessel_qna_snapshot(imo, question_no) 