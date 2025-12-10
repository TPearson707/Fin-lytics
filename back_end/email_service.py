import os
import resend
# Sends emails using Resend (https://resend.com)

# Function to send an email using Resend
def send_email(to_email, subject, content):
    try:
        # Get Resend API key and sender email from environment variables
        resend_api_key = os.getenv('RESEND_API_KEY')
        sender_email = os.getenv('RESEND_SENDER_EMAIL')
        
        if not resend_api_key:
            raise Exception("Missing RESEND_API_KEY in environment variables")
        if not sender_email:
            raise Exception("Missing RESEND_SENDER_EMAIL in environment variables")
        
        # Set the API key
        resend.api_key = resend_api_key
        
        # Send the email
        params = {
            "from": sender_email,
            "to": [to_email],
            "subject": subject,
            "text": content,
        }
        
        response = resend.Emails.send(params)
        
        print(f"Email sent successfully. Message ID: {response.get('id', 'Unknown')}")
        return True  # Return True if email sent successfully
        
    except Exception as e:
        print(f"Email sending failed: {str(e)}")
        return False  # Return False if there was an error
