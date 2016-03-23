# SMS
import twilio
from twilio.rest import TwilioRestClient

account_sid = "AC5755c23dc334935fddd96fc4dd31757d"
auth_token = "4d35f1643235d9d1dec1bf67eae54bfc"
client = TwilioRestClient(account_sid, auth_token)
twilio_number = "16466062457"
numbers = ["+16467342378", "+14124200700"]

def send_sms(msg):
	try:
	    for number in numbers:
	        message = client.messages.create(
	        body=msg,
	        to=number,
	        from_=twilio_number
	    )
	except twilio.TwilioRestException as e:
		print e


# Email
import yagmail

to_emails = ["wjacobson@prescriptivedata.io", "astocchetti@prescriptivedata.io"]

def send_email(subject, body):
    for email in to_emails:
        yagmail.SMTP('pd.program.oops@gmail.com').send( 
	        to=email, 
	        subject=subject, 
	        contents=body
	        )

def send_sms_and_email(subj, body):
    send_sms(body)
    send_email(subj, body)